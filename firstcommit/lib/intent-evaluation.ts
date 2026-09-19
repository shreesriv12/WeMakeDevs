export type IntentEvaluationExample = { id: string; query: string; labels: string[] };
export type IntentEvaluation = { exactMatch: number; microPrecision: number; microRecall: number; microF1: number; examples: number };

export function evaluateIntents(examples: IntentEvaluationExample[], classify: (query: string) => string[]) : IntentEvaluation {
  let truePositive = 0; let predicted = 0; let expected = 0; let exact = 0;
  for (const example of examples) {
    const actual = new Set(example.labels); const result = new Set(classify(example.query));
    truePositive += [...result].filter((label) => actual.has(label)).length;
    predicted += result.size; expected += actual.size;
    if (actual.size === result.size && [...actual].every((label) => result.has(label))) exact++;
  }
  const precision = predicted ? truePositive / predicted : 0;
  const recall = expected ? truePositive / expected : 0;
  return { examples: examples.length, exactMatch: examples.length ? exact / examples.length : 0, microPrecision: precision, microRecall: recall, microF1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0 };
}
