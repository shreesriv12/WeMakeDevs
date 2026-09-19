import type { IntentEvaluationExample } from "./intent-evaluation";

export type IntentModel = { version: 1; labels: string[]; vocabulary: string[]; priors: Record<string, number>; tokenWeights: Record<string, Record<string, number>>; thresholds: Record<string, number> };

export function tokenizeIntent(query: string) {
  return [...new Set((query.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? []))];
}

export function trainIntentModel(examples: IntentEvaluationExample[]): IntentModel {
  const labels = [...new Set(examples.flatMap((example) => example.labels))].sort();
  const vocabulary = [...new Set(examples.flatMap((example) => tokenizeIntent(example.query)))].sort();
  const priors: Record<string, number> = {}; const tokenWeights: Record<string, Record<string, number>> = {};
  for (const label of labels) {
    const positive = examples.filter((example) => example.labels.includes(label));
    priors[label] = Math.log((positive.length + 1) / (examples.length - positive.length + 1));
    const positiveTokens = new Map<string, number>(); const negativeTokens = new Map<string, number>();
    for (const example of examples) for (const token of tokenizeIntent(example.query)) {
      const target = example.labels.includes(label) ? positiveTokens : negativeTokens;
      target.set(token, (target.get(token) ?? 0) + 1);
    }
    const positiveTotal = [...positiveTokens.values()].reduce((sum, count) => sum + count, 0) + vocabulary.length;
    const negativeTotal = [...negativeTokens.values()].reduce((sum, count) => sum + count, 0) + vocabulary.length;
    tokenWeights[label] = Object.fromEntries(vocabulary.map((token) => [token, Math.log(((positiveTokens.get(token) ?? 0) + 1) / positiveTotal) - Math.log(((negativeTokens.get(token) ?? 0) + 1) / negativeTotal)]));
  }
  return { version: 1, labels, vocabulary, priors, tokenWeights, thresholds: Object.fromEntries(labels.map((label) => [label, 0])) };
}

export function scoreIntentModel(model: IntentModel, query: string) {
  const tokens = tokenizeIntent(query);
  return Object.fromEntries(model.labels.map((label) => [label, model.priors[label] + tokens.reduce((score, token) => score + (model.tokenWeights[label][token] ?? 0), 0)]));
}

export function predictIntents(model: IntentModel, query: string) {
  const scores = scoreIntentModel(model, query);
  return model.labels.filter((label) => scores[label] >= model.thresholds[label]);
}

export function tuneIntentThresholds(model: IntentModel, examples: IntentEvaluationExample[]) {
  for (const label of model.labels) {
    const candidates = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
    let best = { threshold: 0, f1: -1 };
    for (const threshold of candidates) {
      let tp = 0; let fp = 0; let fn = 0;
      for (const example of examples) {
        const predicted = scoreIntentModel(model, example.query)[label] >= threshold; const actual = example.labels.includes(label);
        if (predicted && actual) tp++; else if (predicted) fp++; else if (actual) fn++;
      }
      const f1 = tp ? (2 * tp) / ((2 * tp) + fp + fn) : 0;
      if (f1 > best.f1) best = { threshold, f1 };
    }
    model.thresholds[label] = best.threshold;
  }
  return model;
}
