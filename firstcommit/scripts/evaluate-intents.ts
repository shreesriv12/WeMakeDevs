import { readFile } from "node:fs/promises";
import { evaluateIntents, type IntentEvaluationExample } from "../lib/intent-evaluation";
import { heuristicIntents } from "../lib/intent-router";

async function main() {
  const examples = (await readFile(new URL("../data/intent/test.jsonl", import.meta.url), "utf8")).trim().split("\n").map((line) => JSON.parse(line) as IntentEvaluationExample);
  const metrics = evaluateIntents(examples, heuristicIntents);
  console.log(JSON.stringify({ evaluator: "heuristic-baseline", ...metrics }, null, 2));
}

void main();
