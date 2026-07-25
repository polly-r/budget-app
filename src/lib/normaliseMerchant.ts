/**
 * Cleans a raw SA bank transaction description into a normalised merchant name.
 * Strips channel prefixes, date stamps, and reference numbers, then title-cases.
 * Safe to call with any string — returns the original (title-cased) if nothing matches.
 */

// Ordered: more-specific patterns before general ones.
// Each regex is applied in sequence so multi-layer prefixes like
// "NEDBANK CARD PURCHASE WOOLWORTHS" are unwrapped in two passes.
const PREFIXES: RegExp[] = [
  // Hash prefix (ABSA style: "#ABSA BANK*...")
  /^#/,
  // Bank name tags — specific multi-word forms first
  /^CAPITEC BANK\s*/,
  /^ABSA BANK\s*/,
  /^STANDARD BANK\s*/,
  /^DISCOVERY BANK\s*/,
  /^NEDBANK\s*/,
  /^ABSA\s*/,
  /^FNB\s*/,
  /^STD BNK\s*/,
  /^INVESTEC\s*/,
  // Slash/asterisk separators left after bank-name strip (e.g. "/CARD/")
  /^[/*]+/,
  // Channel / payment-type prefixes
  /^POS PURCHASE\s*/,
  /^POS DEB(?:IT)?\s*/,
  /^POS CREDIT\s*/,
  /^CARD PURCHASE\s*/,
  /^CARD PAYMENT\s*/,
  /^DEBIT CARD\s*/,
  /^DEBIT ORDER\s*/,
  /^CARD[/ ]/,             // FNB: "CARD/MERCHANT"
  /^INTERNET TR[FN](?:\s+TO)?\s*/,
  /^INTERNET TRANSFER(?:\s+TO)?\s*/,
  /^EFT PAYMENT\s*/,
  /^EFT (?:TO|FROM)\s*/,
  /^EFT\s*/,
  /^ACH (?:DEBIT|CREDIT)\s*/,
  /^ONLINE PURCHASE\s*/,
  /^ONLINE PAYMENT\s*/,
  /^INSTANT PAY(?:MENT)?\s*/,
  /^PAYSHAP\s*/,
  /^PAYFAST\s*/,
  /^PAYMENT (?:TO|FROM) /,
  // Leftover slash separators
  /^[/*]+/,
];

// Noise patterns — ordered carefully:
// 1. Named tokens (ACC/REF) removed as full phrases first
// 2. Date formats (most specific → least specific)
// 3. Card tail as a unit (4005/12345678) before the generic digit sweep
// 4. Generic 6+ digit sweep
// 5. Trailing 4-5 digit card number (e.g. "DISCHEM PHARMACY 4005")
// 6. Cleanup
const NOISE: RegExp[] = [
  /\bACC(?:OUNT)?\s*\d+/g,
  /\bREF\s*:?\s*\w+/g,
  // ISO date: 2024-06-14
  /\b\d{4}-\d{2}-\d{2}\b/g,
  // Date formats: 14/06, 14/06/24, 14-06-2024
  /\b\d{2}[/\-]\d{2}(?:[/\-]\d{2,4})?\b/g,
  // Date format: 14JUN24, 14JUN2024
  /\b\d{1,2}[A-Z]{3}\d{2,4}\b/g,
  // Card tail + reference as a unit: "4005/12345678"
  /\b\d{4,5}\/\d+\b/g,
  // Standalone 6+ digit numbers (references, account numbers)
  /\b\d{6,}\b/g,
  // Trailing 4-5 digit card segment left after its reference was removed
  /\s+\d{4,5}\s*$/g,
  // Stray "ACC" left when its digits were already removed
  /\bACC\b/g,
  // Hash-prefixed reference: #12345
  /#\d+/g,
];

/**
 * Title-case that capitalises after start-of-string, spaces, and hyphens,
 * but NOT after apostrophes (don't → Don't) or dots (netflix.com → Netflix.com).
 */
function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s\-])([a-z])/g, (_, prefix, c) => prefix + c.toUpperCase());
}

export function normaliseMerchant(raw: string): string {
  if (!raw || !raw.trim()) return "";

  let s = raw.toUpperCase().trim();

  // Replace asterisks used as field delimiters with a space
  s = s.replace(/\*/g, " ");

  // Strip bank/channel prefixes — loop until no more match
  let prev: string;
  do {
    prev = s;
    for (const prefix of PREFIXES) {
      s = s.replace(prefix, "").trimStart();
    }
  } while (s !== prev);

  // Strip date and reference noise
  for (const pattern of NOISE) {
    s = s.replace(pattern, " ");
  }

  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  // Remove stray leading/trailing punctuation
  s = s.replace(/^[^a-zA-Z0-9]+/, "").replace(/[^a-zA-Z0-9)]+$/, "").trim();

  return toTitleCase(s) || toTitleCase(raw.trim());
}

// ---------------------------------------------------------------------------
// Inline tests — run with: npx tsx src/lib/normaliseMerchant.ts
// ---------------------------------------------------------------------------
if (process.argv[1] && process.argv[1].includes("normaliseMerchant")) {
  const cases: [string, string][] = [
    // POS / card prefixes
    ["POS PURCHASE WOOLWORTHS 012345 14/06",            "Woolworths"],
    ["CARD PURCHASE PICK N PAY 100001234567 2024-06-14","Pick N Pay"],
    ["DEBIT CARD DISCHEM PHARMACY 4005/12345678",       "Dischem Pharmacy"],

    // Capitec
    ["CAPITEC BANK*UBER 14JUN24",                      "Uber"],
    ["CAPITEC BANK*MCDONALD'S 987654",                 "Mcdonald's"],

    // ABSA hash style
    ["#ABSA BANK*TAKE-A-LOT 0800000000",               "Take-A-Lot"],

    // FNB slash style
    ["FNB/CARD/NETFLIX.COM 123456789",                 "Netflix.com"],

    // Debit orders
    ["DEBIT ORDER VODACOM AIRTIME 987654321",          "Vodacom Airtime"],
    ["DEBIT ORDER DISCOVERY HEALTH PREM",              "Discovery Health Prem"],

    // EFT
    ["EFT PAYMENT EDGARS ACCOUNT",                    "Edgars Account"],
    ["EFT TO SAVINGS ACC 1234567890",                 "Savings"],

    // Online
    ["ONLINE PURCHASE TAKEALOT.COM 987654",           "Takealot.com"],

    // Already clean
    ["Netflix",                                       "Netflix"],
    ["UBER",                                          "Uber"],

    // Standard Bank slash style
    ["CARD PURCHASE/WOOLWORTHS FOOD 4005/12345678",   "Woolworths Food"],
  ];

  let passed = 0;
  let failed = 0;
  for (const [input, expected] of cases) {
    const result = normaliseMerchant(input);
    const ok = result === expected;
    if (ok) {
      passed++;
      console.log(`  ✓  "${input}" → "${result}"`);
    } else {
      failed++;
      console.error(`  ✗  "${input}"\n     expected: "${expected}"\n     got:      "${result}"`);
    }
  }
  console.log(`\n${passed}/${passed + failed} tests passed`);
}
