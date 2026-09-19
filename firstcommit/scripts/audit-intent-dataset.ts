import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

type Row = { id?: string; query: string; labels: string[] };
const labels = ["assessment", "personalization", "knowledge_retrieval", "language_support", "external_research"];
async function load(path: string) { return (await readFile(path, "utf8")).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as Row); }
function key(query: string) { return createHash("sha256").update(query.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()).digest("hex"); }
function language(query: string) { return /[\u0900-\u097F]/.test(query) ? "Hindi" : /\b(mujhe|samjhao|hinglish|kaise|kya|par|mein)\b/i.test(query) ? "Hinglish" : "English"; }
async function main() {
  const root = process.argv[2] ?? "data/intent/reviewed";
  const splits = Object.fromEntries(await Promise.all(["train", "validation", "test"].map(async (name) => [name, await load(`${root}/${name}.jsonl`)]))) as Record<string, Row[]>;
  const seen = new Map<string, string>(); const leakage: string[] = []; const counts = Object.fromEntries(labels.map((label) => [label, 0])); const languages: Record<string, number> = { English: 0, Hindi: 0, Hinglish: 0 };
  for (const [split, rows] of Object.entries(splits)) for (const row of rows) { for (const label of row.labels) if (label in counts) counts[label]++; languages[language(row.query)]++; const normalized=key(row.query); const previous=seen.get(normalized); if (previous && previous !== split) leakage.push(row.id ?? normalized.slice(0, 8)); else seen.set(normalized, split); }
  const total = Object.values(splits).reduce((sum, rows) => sum + rows.length, 0); const missingLabels=labels.filter((label)=>counts[label]<30); const report={ total, splits:Object.fromEntries(Object.entries(splits).map(([name,rows])=>[name,rows.length])), labels:counts, languageCoverage:languages, crossSplitDuplicateCount:leakage.length, lowCoverageLabels:missingLabels, readyForTraining: total>=300 && leakage.length===0 && missingLabels.length===0 };
  console.log(JSON.stringify(report,null,2)); if(!report.readyForTraining) process.exitCode=2;
}
void main();
