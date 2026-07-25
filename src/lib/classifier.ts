import { promises as fs } from "fs";
import path from "path";

const MODEL_PATH = path.join(process.cwd(), "prisma", "classifier-model.json");

export type ClassifierModel = {
  trainedAt: string;
  trainedOn: number;
  categoryCount: number;
  logPriors: Record<string, number>;
  logLikelihoods: Record<string, Record<string, number>>;
  defaultLogLikelihoods: Record<string, number>;
};

/**
 * Tokenises a normalised merchant name into unigrams + bigrams.
 * Short strings (e.g. "Uber") just yield a single unigram.
 */
export function tokenise(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1);
  const bigrams = words.slice(0, -1).map((w, i) => `${w}_${words[i + 1]}`);
  return [...words, ...bigrams];
}

/**
 * Trains a Multinomial Naïve Bayes model with Laplace smoothing (α=1).
 * Each doc is { text: normalisedMerchantName, categoryId }.
 */
export function trainModel(
  docs: Array<{ text: string; categoryId: string }>
): ClassifierModel {
  const wordCounts: Record<string, Record<string, number>> = {};
  const classCounts: Record<string, number> = {};
  const vocab = new Set<string>();

  for (const doc of docs) {
    const tokens = tokenise(doc.text);
    classCounts[doc.categoryId] = (classCounts[doc.categoryId] ?? 0) + 1;
    if (!wordCounts[doc.categoryId]) wordCounts[doc.categoryId] = {};
    for (const t of tokens) {
      vocab.add(t);
      wordCounts[doc.categoryId][t] = (wordCounts[doc.categoryId][t] ?? 0) + 1;
    }
  }

  const N = docs.length;
  const V = Math.max(vocab.size, 1);
  const alpha = 1;

  const logPriors: Record<string, number> = {};
  for (const [cat, count] of Object.entries(classCounts)) {
    logPriors[cat] = Math.log(count / N);
  }

  const logLikelihoods: Record<string, Record<string, number>> = {};
  const defaultLogLikelihoods: Record<string, number> = {};

  for (const [cat, words] of Object.entries(wordCounts)) {
    const total = Object.values(words).reduce((a, b) => a + b, 0);
    defaultLogLikelihoods[cat] = Math.log(alpha / (total + alpha * V));
    logLikelihoods[cat] = {};
    for (const [word, count] of Object.entries(words)) {
      logLikelihoods[cat][word] = Math.log((count + alpha) / (total + alpha * V));
    }
  }

  return {
    trainedAt: new Date().toISOString(),
    trainedOn: N,
    categoryCount: Object.keys(classCounts).length,
    logPriors,
    logLikelihoods,
    defaultLogLikelihoods,
  };
}

/**
 * Classifies a normalised merchant name.
 * Returns null if the top prediction is below the 0.70 confidence threshold.
 */
export function predict(
  model: ClassifierModel,
  text: string
): { categoryId: string; confidence: number } | null {
  const tokens = tokenise(text);
  if (tokens.length === 0) return null;

  const rawScores: Record<string, number> = {};
  for (const [cat, logPrior] of Object.entries(model.logPriors)) {
    let score = logPrior;
    for (const t of tokens) {
      score += model.logLikelihoods[cat]?.[t] ?? model.defaultLogLikelihoods[cat] ?? -10;
    }
    rawScores[cat] = score;
  }

  const cats = Object.keys(rawScores);
  if (cats.length === 0) return null;

  // Softmax for calibrated confidence
  const maxScore = Math.max(...Object.values(rawScores));
  const expScores = Object.fromEntries(cats.map(c => [c, Math.exp(rawScores[c] - maxScore)]));
  const sumExp = Object.values(expScores).reduce((a, b) => a + b, 0);

  const bestCat = cats.reduce((a, b) => (rawScores[a] > rawScores[b] ? a : b));
  const confidence = expScores[bestCat] / sumExp;

  return confidence >= 0.70 ? { categoryId: bestCat, confidence } : null;
}

export async function saveModel(model: ClassifierModel): Promise<void> {
  await fs.writeFile(MODEL_PATH, JSON.stringify(model, null, 2), "utf-8");
}

export async function loadModel(): Promise<ClassifierModel | null> {
  try {
    const raw = await fs.readFile(MODEL_PATH, "utf-8");
    return JSON.parse(raw) as ClassifierModel;
  } catch {
    return null;
  }
}

export async function getModelStats(): Promise<{
  exists: boolean;
  trainedAt?: string;
  trainedOn?: number;
  categoryCount?: number;
} > {
  const model = await loadModel();
  if (!model) return { exists: false };
  return {
    exists: true,
    trainedAt: model.trainedAt,
    trainedOn: model.trainedOn,
    categoryCount: model.categoryCount,
  };
}
