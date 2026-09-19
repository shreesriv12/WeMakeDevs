import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { IntentEvaluationExample } from "../lib/intent-evaluation";

const allowedLabels = new Set(["assessment", "personalization", "knowledge_retrieval", "language_support", "external_research"]);

function parseCsv(line: string) {
  const values: string[] = []; let value = ""; let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') { value += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { values.push(value); value = ""; }
    else value += char;
  }
  values.push(value); return values;
}

function hash(value: string) {
  let result = 2166136261;
  for (const char of value) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); }
  return result >>> 0;
}

async function loadJsonl(name: string) {
  return (await readFile(resolve("data/intent", `${name}.jsonl`), "utf8")).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as IntentEvaluationExample);
}

async function main() {
  const queue = resolve(process.argv[2] ?? "data/intent/intent-review-queue.csv");
  const lines = (await readFile(queue, "utf8")).split(/\r?\n/).filter(Boolean).map(parseCsv);
  const [header, ...rows] = lines;
  const expected = ["id", "query", "suggested_labels", "reviewed_labels", "decision", "reviewer_notes", "source"];
  if (header.join(",") !== expected.join(",")) throw new Error("Unexpected review queue header");
  const approved = rows.filter((row) => row[4].trim().toLowerCase() === "approved").map((row) => {
    const labels = row[3].split("|").map((label) => label.trim()).filter(Boolean);
    if (!row[1].trim() || !labels.length || labels.some((label) => !allowedLabels.has(label))) throw new Error(`Invalid approved row: ${row[0]}`);
    return { id: `reviewed-${row[0]}`, query: row[1].trim(), labels };
  });
  const existing = (await Promise.all([loadJsonl("train"), loadJsonl("validation"), loadJsonl("test")])).flat();
  const corpus = [...existing, ...approved];
  const normalized = corpus.map((item) => item.query.toLowerCase());
  if (new Set(normalized).size !== corpus.length) throw new Error("A reviewed query duplicates an existing query");
  const shuffled = [...corpus].sort((left, right) => hash(`shikshamesh-v2:${left.query}`) - hash(`shikshamesh-v2:${right.query}`));
  const trainEnd = Math.floor(shuffled.length * 0.8); const validationEnd = trainEnd + Math.floor(shuffled.length * 0.1);
  const output = resolve("data/intent/reviewed"); await mkdir(output, { recursive: true });
  const splits: Array<[string, IntentEvaluationExample[]]> = [["train", shuffled.slice(0, trainEnd)], ["validation", shuffled.slice(trainEnd, validationEnd)], ["test", shuffled.slice(validationEnd)]];
  for (const [name, examples] of splits) {
    await writeFile(resolve(output, `${name}.jsonl`), `${examples.map((item) => JSON.stringify(item)).join("\n")}\n`);
  }
  console.log(JSON.stringify({ existingExamples: existing.length, approvedExamples: approved.length, total: corpus.length, train: trainEnd, validation: validationEnd - trainEnd, test: corpus.length - validationEnd }, null, 2));
}

void main();
