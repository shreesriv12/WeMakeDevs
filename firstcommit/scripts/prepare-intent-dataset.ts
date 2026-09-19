import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import type { IntentEvaluationExample } from "../lib/intent-evaluation";

const allowedLabels = new Set(["assessment", "personalization", "knowledge_retrieval", "language_support", "external_research"]);

function parseRow(line: string) {
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

function stableHash(value: string) {
  let hash = 2166136261;
  for (const char of value) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

function jsonl(rows: IntentEvaluationExample[]) { return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`; }

async function main() {
  const source = process.argv[2];
  if (!source) throw new Error("Usage: npm run prepare:intents -- <path-to-intent-training.csv>");
  const lines = (await readFile(resolve(source), "utf8")).replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const [header] = lines.map(parseRow);
  if (header?.join(",") !== "query,labels") throw new Error("CSV must contain exactly: query,labels");
  const rows = lines.slice(1).map((line, index) => {
    const [query, labels, extra] = parseRow(line);
    if (!query?.trim() || !labels?.trim() || extra !== undefined) throw new Error(`Invalid row ${index + 2}`);
    const labelList = labels.split("|").map((label) => label.trim());
    if (labelList.some((label) => !allowedLabels.has(label))) throw new Error(`Unknown label on row ${index + 2}`);
    return { id: `intent-${String(index + 1).padStart(4, "0")}`, query: query.trim(), labels: labelList };
  });
  if (new Set(rows.map((row) => row.query.toLowerCase())).size !== rows.length) throw new Error("Duplicate queries are not allowed");
  const shuffled = [...rows].sort((a, b) => stableHash(`shikshamesh-v1:${a.query}`) - stableHash(`shikshamesh-v1:${b.query}`));
  const trainEnd = Math.floor(shuffled.length * 0.8); const validationEnd = trainEnd + Math.floor(shuffled.length * 0.1);
  const output = resolve("data/intent"); await mkdir(output, { recursive: true });
  await Promise.all([
    writeFile(resolve(output, "train.jsonl"), jsonl(shuffled.slice(0, trainEnd))),
    writeFile(resolve(output, "validation.jsonl"), jsonl(shuffled.slice(trainEnd, validationEnd))),
    writeFile(resolve(output, "test.jsonl"), jsonl(shuffled.slice(validationEnd)))
  ]);
  console.log(JSON.stringify({ source: basename(source), total: rows.length, train: trainEnd, validation: validationEnd - trainEnd, test: rows.length - validationEnd }, null, 2));
}

void main();
