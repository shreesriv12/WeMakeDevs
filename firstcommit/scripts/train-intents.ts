import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evaluateIntents, type IntentEvaluationExample } from "../lib/intent-evaluation";
import { predictIntents, trainIntentModel, tuneIntentThresholds } from "../lib/intent-model";

async function load(name: string) {
  return (await readFile(new URL(`../data/intent/${name}.jsonl`, import.meta.url), "utf8")).trim().split("\n").map((line) => JSON.parse(line) as IntentEvaluationExample);
}

async function main() {
  const [train, validation, test] = await Promise.all([load("train"), load("validation"), load("test")]);
  const includeSynthetic = process.argv.includes("--include-synthetic");
  const synthetic = includeSynthetic ? await load("augmentation") : [];
  const trainingSet = [...train, ...synthetic];
  const model = tuneIntentThresholds(trainIntentModel(trainingSet), validation);
  await mkdir(resolve("artifacts"), { recursive: true });
  const artifact = includeSynthetic ? "artifacts/intent-model-v1-synthetic.json" : "artifacts/intent-model-v1.json";
  await writeFile(resolve(artifact), `${JSON.stringify(model, null, 2)}\n`);
  console.log(JSON.stringify({ model: artifact, trainExamples: trainingSet.length, syntheticExamples: synthetic.length, validationExamples: validation.length, test: evaluateIntents(test, (query) => predictIntents(model, query)), thresholds: model.thresholds }, null, 2));
}

void main();
