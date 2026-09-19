import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const topics = [
  "fractions", "quadratic equations", "trigonometry", "probability",
  "photosynthesis", "human digestion", "Newton's laws", "chemical bonding",
  "Indian independence movement", "Indian Constitution", "climate change", "maps and latitude",
  "Hindi grammar", "English essay writing", "financial accounting", "marketing fundamentals",
  "data structures", "DBMS normalization", "computer networks", "Python programming"
];
const single = [
  ["assessment", ["Create 10 MCQs on {topic}", "Mujhe {topic} par practice test do", "Make a short quiz from {topic}", "{topic} ke questions banao"]],
  ["personalization", ["Analyze my weak areas in {topic}", "Mere last score ke hisaab se {topic} revise karvao", "Track my progress for {topic}", "Why am I weak in {topic}?"]],
  ["knowledge_retrieval", ["Show my study notes for {topic}", "Find {topic} in my PDF", "Mere notes me {topic} ka section kholo", "Syllabus material for {topic} dikhao"]],
  ["language_support", ["Explain {topic} in Hindi", "{topic} ko Hinglish me samjhao", "Translate this {topic} answer into English", "{topic} आसान भाषा में बताओ"]],
  ["external_research", ["Search latest official learning guidance about {topic}", "Find current official information on {topic}", "Search recent educational research for {topic}", "Latest official updates on {topic} check karo"]]
] as const;
const pairs = [
  [["assessment", "knowledge_retrieval"], "Use my study notes to make a {topic} quiz"],
  [["assessment", "language_support"], "{topic} par Hindi test questions banao"],
  [["assessment", "personalization"], "My weak {topic} areas se practice quiz banao"],
  [["assessment", "external_research"], "Search current {topic} guidelines and make a test"],
  [["knowledge_retrieval", "language_support"], "My PDF se {topic} Hinglish me samjhao"],
  [["knowledge_retrieval", "external_research"], "Compare my {topic} notes with latest official guidance"],
  [["personalization", "language_support"], "Mere weak {topic} concepts Hindi me explain karo"],
  [["personalization", "external_research"], "My {topic} progress ke liye latest study resources search karo"],
  [["language_support", "external_research"], "Latest {topic} updates Hindi me batao"],
  [["personalization", "knowledge_retrieval"], "My notes use karke {topic} weak areas analyze karo"]
] as const;

async function main() {
  const rows: { id: string; query: string; labels: string[]; source: string }[] = []; let id = 1;
  for (const [label, templates] of single) for (const template of templates) for (const topic of topics) rows.push({ id: `synthetic-${String(id++).padStart(4, "0")}`, query: template.replace("{topic}", topic), labels: [label], source: "synthetic-review-required" });
  for (const [labels, template] of pairs) for (const topic of topics) rows.push({ id: `synthetic-${String(id++).padStart(4, "0")}`, query: template.replace("{topic}", topic), labels: [...labels], source: "synthetic-review-required" });
  await mkdir(resolve("data/intent"), { recursive: true });
  const output = resolve(process.argv[2] ?? "data/intent/augmentation.jsonl");
  await writeFile(output, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
  console.log(JSON.stringify({ generated: rows.length, output, totalCorpusWithOriginal: rows.length + 120, note: "Review synthetic rows before using them for production training." }, null, 2));
}
void main();
