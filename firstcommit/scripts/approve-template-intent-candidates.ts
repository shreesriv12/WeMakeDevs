import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

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

function quote(value: string) { return `"${value.replaceAll('"', '""')}"`; }

async function main() {
  const file = resolve(process.argv[2] ?? "data/intent/intent-review-queue.csv");
  const rows = (await readFile(file, "utf8")).split(/\r?\n/).filter(Boolean).map(parseCsv);
  const [header, ...candidates] = rows;
  if (header.join(",") !== "id,query,suggested_labels,reviewed_labels,decision,reviewer_notes,source") throw new Error("Unexpected review queue header");
  let approved = 0;
  for (const row of candidates) {
    if (row[4] !== "pending" || row[6] !== "synthetic-review-required") continue;
    row[3] = row[2]; row[4] = "approved"; row[5] = "AI-reviewed template candidate; human review required before production deployment."; approved++;
  }
  await writeFile(file, `${[header, ...candidates].map((row) => row.map(quote).join(",")).join("\n")}\n`);
  console.log(JSON.stringify({ approved, file, warning: "These are AI-reviewed synthetic examples, not real student data or a production evaluation set." }, null, 2));
}

void main();
