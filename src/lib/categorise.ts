import { db } from "@/lib/db";
import { normaliseMerchant } from "@/lib/normaliseMerchant";
import { predict, loadModel } from "@/lib/classifier";

// SA-specific keyword rules. Each pattern is tested against the normalised
// merchant name (title-cased, noise-stripped). categoryNames lists candidate
// category names in priority order — the first one found in the DB wins.
const KEYWORD_RULES: Array<{ pattern: RegExp; categoryNames: string[] }> = [
  {
    pattern: /woolworths|pick.?n.?pay|checkers|spar|shoprite|food.?lover|ok.?food|usave|boxer|freshstop/i,
    categoryNames: ["Groceries", "Food & Groceries", "Food", "Shopping"],
  },
  {
    pattern: /uber|bolt|taxify|gautrain|myciti|metrorail|brt|transnet/i,
    categoryNames: ["Transport", "Travel", "Commute"],
  },
  {
    pattern: /sasol|engen|shell|caltex|bp|total(?!.?(insure|life|invest))/i,
    categoryNames: ["Petrol", "Fuel", "Transport", "Travel"],
  },
  {
    pattern: /steers|nando|mcdonalds|kfc|burger.?king|pizza.?hut|debonairs|spur|ocean.?basket|panarottis|wimpy|fishaways|roman.?pizza|wiesenhof/i,
    categoryNames: ["Dining Out", "Restaurants", "Food & Dining", "Entertainment"],
  },
  {
    pattern: /mr.?price|ackermans|edgars|truworths|foschini|jet.?store|identity|cotton.?on|h.?m|zara|woolworths.?clothes/i,
    categoryNames: ["Clothing", "Shopping"],
  },
  {
    pattern: /netflix|showmax|dstv|multichoice|spotify|apple.?tv|amazon.?prime|disney|youtube.?premium/i,
    categoryNames: ["Entertainment", "Subscriptions"],
  },
  {
    pattern: /eskom|city.?power|joburg.?water|ethekwini|cape.?town.?water|openserve|telkom(?!.?mobile)/i,
    categoryNames: ["Utilities", "Bills"],
  },
  {
    pattern: /vodacom|mtn|cell.?c|telkom.?mobile|airtime|prepaid.?data/i,
    categoryNames: ["Mobile", "Telecoms", "Phone", "Utilities"],
  },
  {
    pattern: /discovery.?health|bonitas|momentum.?health|medscheme|genesis.?medical|gems/i,
    categoryNames: ["Medical Aid", "Health", "Medical", "Insurance"],
  },
  {
    pattern: /dischem|clicks.?pharmacy|medirite|dis.?chem/i,
    categoryNames: ["Pharmacy", "Medical", "Health"],
  },
  {
    pattern: /discovery.?insure|outsurance|santam|hollard|miway|mutual.?limited|sanlam.?(?!health)/i,
    categoryNames: ["Insurance"],
  },
  {
    pattern: /takealot|amazon|ebay/i,
    categoryNames: ["Online Shopping", "Shopping"],
  },
  {
    pattern: /gym|virgin.?active|planet.?fitness|curves|crossfit/i,
    categoryNames: ["Gym", "Health & Fitness", "Fitness"],
  },
  {
    pattern: /school|university|varsity|college|tuition|fees/i,
    categoryNames: ["Education", "School Fees"],
  },
  {
    pattern: /bond|mortgage|rent|levy|sectional.?title/i,
    categoryNames: ["Housing", "Rent", "Home"],
  },
];

// Levenshtein edit distance — pure TS, no deps.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const row: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(prev + 1, row[j] + 1, row[j - 1] + cost);
      row[j - 1] = prev;
      prev = next;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

export type CategoriseResult = {
  categoryId: string;
  confidence: number;
  autoTagged: true;
  method: "exact" | "keyword" | "fuzzy" | "classifier";
};

/**
 * Runs the categorisation cascade on a raw transaction description.
 * Returns null if no confident match is found — caller should not overwrite
 * any manually-set category.
 */
export async function categorise(description: string): Promise<CategoriseResult | null> {
  const key = normaliseMerchant(description);
  if (!key) return null;

  // 1. Exact match in MerchantMemory (learned from prior user corrections)
  const exact = await db.merchantMemory.findUnique({ where: { normalised: key } });
  if (exact) {
    return { categoryId: exact.categoryId, confidence: 1.0, autoTagged: true, method: "exact" };
  }

  // 2. Keyword rules — SA merchant patterns matched against the normalised name
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(key)) {
      for (const name of rule.categoryNames) {
        const cat = await db.category.findFirst({ where: { name, archived: false } });
        if (cat) {
          return { categoryId: cat.id, confidence: 0.85, autoTagged: true, method: "keyword" };
        }
      }
    }
  }

  // 3. Fuzzy match against existing MerchantMemory keys
  const memories = await db.merchantMemory.findMany({
    select: { normalised: true, categoryId: true },
    orderBy: { hitCount: "desc" },
    take: 300,
  });

  let bestScore = 0;
  let bestCategoryId: string | null = null;
  for (const mem of memories) {
    const score = similarity(key, mem.normalised);
    if (score > bestScore) { bestScore = score; bestCategoryId = mem.categoryId; }
  }

  if (bestScore >= 0.85 && bestCategoryId) {
    return { categoryId: bestCategoryId, confidence: bestScore, autoTagged: true, method: "fuzzy" };
  }

  // 3b. ML classifier — only fires if a model has been trained
  const model = await loadModel();
  if (model) {
    const clf = predict(model, key);
    if (clf) {
      return { categoryId: clf.categoryId, confidence: clf.confidence, autoTagged: true, method: "classifier" };
    }
  }

  return null;
}

/**
 * Records a user's manual category choice so future transactions from the
 * same merchant are matched automatically.
 */
export async function learnMerchant(description: string, categoryId: string): Promise<void> {
  const key = normaliseMerchant(description);
  if (!key) return;
  await db.merchantMemory.upsert({
    where: { normalised: key },
    create: { normalised: key, categoryId, hitCount: 1 },
    update: { categoryId, hitCount: { increment: 1 } },
  });
}
