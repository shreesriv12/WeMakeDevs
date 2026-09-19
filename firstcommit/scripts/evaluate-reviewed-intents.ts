import { readFile } from "node:fs/promises";
import { evaluateIntents, type IntentEvaluationExample } from "../lib/intent-evaluation";
import { heuristicIntents } from "../lib/intent-router";

async function main() {
  const file = process.argv[2] ?? "data/intent/reviewed/test.jsonl";
  const rows = (await readFile(file, "utf8")).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as IntentEvaluationExample);
  console.log(JSON.stringify({ evaluator: "heuristic-baseline", dataset: file, ...evaluateIntents(rows, heuristicIntents) }, null, 2));
}

void main();
