import { readFile } from "node:fs/promises";
import { predictIntents, type IntentModel } from "../lib/intent-model";
import type { IntentEvaluationExample } from "../lib/intent-evaluation";

async function loadJsonl(name: string) {
  return (await readFile(new URL(`../data/intent/${name}.jsonl`, import.meta.url), "utf8")).trim().split("\n").map((line) => JSON.parse(line) as IntentEvaluationExample);
}

async function main() {
  const [test, model] = await Promise.all([
    loadJsonl("test"),
    readFile(new URL("../artifacts/intent-model-v1.json", import.meta.url), "utf8").then((value) => JSON.parse(value) as IntentModel)
  ]);
  const perLabel = Object.fromEntries(model.labels.map((label) => [label, { tp: 0, fp: 0, fn: 0 }]));
  const errors = test.flatMap((example) => {
    const predicted = predictIntents(model, example.query); const expected = new Set(example.labels); const actual = new Set(predicted);
    for (const label of model.labels) {
      if (expected.has(label) && actual.has(label)) perLabel[label].tp++;
      else if (actual.has(label)) perLabel[label].fp++;
      else if (expected.has(label)) perLabel[label].fn++;
    }
    return expected.size === actual.size && [...expected].every((label) => actual.has(label)) ? [] : [{ id: example.id, query: example.query, expected: example.labels, predicted }];
  });
  const metrics = Object.fromEntries(Object.entries(perLabel).map(([label, counts]) => {
    const precision = counts.tp ? counts.tp / (counts.tp + counts.fp) : 0; const recall = counts.tp ? counts.tp / (counts.tp + counts.fn) : 0;
    return [label, { ...counts, precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0 }];
  }));
  console.log(JSON.stringify({ perLabel: metrics, errors }, null, 2));
}

void main();
