import { readFile } from "node:fs/promises";
import { evaluateIntents, type IntentEvaluationExample } from "../lib/intent-evaluation";
import { heuristicIntents } from "../lib/intent-router";

async function rows(path: string) { return (await readFile(path, "utf8")).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as IntentEvaluationExample); }
function metric(input: Record<string, unknown>) {
  const value = input.micro_f1 ?? input.test_micro_f1 ?? input.microF1;
  if (typeof value !== "number" || value < 0 || value > 1) throw new Error("metrics.json does not contain a valid micro F1");
  return value;
}

async function main() {
  const root = process.argv[2] ?? "data/intent/reviewed";
  const metricsPath = process.argv[3] ?? "ml/artifacts/intent-gru/metrics.json";
  const [train, validation, test, metricsText] = await Promise.all([rows(`${root}/train.jsonl`), rows(`${root}/validation.jsonl`), rows(`${root}/test.jsonl`), readFile(metricsPath, "utf8")]);
  const baseline = evaluateIntents(test, heuristicIntents);
  const trainedMicroF1 = metric(JSON.parse(metricsText) as Record<string, unknown>);
  const reviewedExamples = train.length + validation.length + test.length;
  const minimumExamples = 300;
  const passesDataset = reviewedExamples >= minimumExamples;
  const passesBaseline = trainedMicroF1 > baseline.microF1;
  const decision = passesDataset && passesBaseline ? "approved-for-batch-inference-review" : "blocked";
  console.log(JSON.stringify({ decision, reviewedExamples, minimumExamples, testExamples: test.length, heuristic: baseline, trained: { microF1: trainedMicroF1, metricsPath }, gates: { reviewedDatasetAtLeast300: passesDataset, beatsHeuristicOnUntouchedTest: passesBaseline }, nextStep: decision === "blocked" ? "Add reviewed examples or improve the model; do not create a SageMaker endpoint." : "Human review is still required before limited batch inference." }, null, 2));
  if (decision === "blocked") process.exitCode = 2;
}
void main();
