import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type Candidate = { id: string; query: string; labels: string[]; source?: string };

function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }

async function main() {
  const source = resolve(process.argv[2] ?? "data/intent/augmentation.jsonl");
  const destination = resolve(process.argv[3] ?? "data/intent/intent-review-queue.csv");
  const candidates = (await readFile(source, "utf8")).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as Candidate);
  const unique = [...new Map(candidates.map((candidate) => [candidate.query.trim().toLowerCase(), candidate])).values()];
  const header = ["id", "query", "suggested_labels", "reviewed_labels", "decision", "reviewer_notes", "source"];
  const rows = unique.map((candidate) => [candidate.id, candidate.query, candidate.labels.join("|"), "", "pending", "", candidate.source ?? "unknown"]);
  await mkdir(resolve(destination, ".."), { recursive: true });
  await writeFile(destination, `${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`);
  console.log(JSON.stringify({ sourceCandidates: candidates.length, uniqueCandidates: unique.length, duplicatesRemoved: candidates.length - unique.length, destination, instruction: "Set decision to approved or rejected; provide reviewed_labels for approved rows." }, null, 2));
}

void main();
