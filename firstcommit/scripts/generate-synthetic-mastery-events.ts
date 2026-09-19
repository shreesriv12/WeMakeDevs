import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const topics = ["fractions", "algebra", "photosynthesis", "newton-laws", "indian-constitution", "hindi-grammar", "financial-accounting", "python-programming"];
const difficulties = ["easy", "medium", "hard"];

function random(seed: number) {
  let state = seed >>> 0;
  return () => { state = Math.imul(1664525, state) + 1013904223 >>> 0; return state / 4294967296; };
}

async function main() {
  const rows = ["learner_id,topic_id,question_id,is_correct,occurred_at,difficulty"];
  const next = random(20260919);
  for (let learner = 1; learner <= 80; learner++) {
    const mastery = topics.map(() => 0.25 + (next() * 0.6));
    for (let attempt = 0; attempt < 28; attempt++) {
      const topicIndex = Math.floor(next() * topics.length); const difficultyIndex = Math.min(2, Math.floor(next() * difficulties.length));
      const probability = Math.max(0.08, Math.min(0.93, mastery[topicIndex] - (difficultyIndex * 0.16)));
      const correct = next() < probability ? 1 : 0;
      mastery[topicIndex] = Math.max(0.05, Math.min(0.95, mastery[topicIndex] + (correct ? 0.025 : -0.015)));
      const timestamp = new Date(Date.UTC(2026, 0, 1, 9, 0, 0) + ((learner * 60 + attempt) * 60_000)).toISOString();
      rows.push(`synthetic-learner-${String(learner).padStart(3, "0")},${topics[topicIndex]},${topics[topicIndex]}-q-${String((attempt % 12) + 1).padStart(2, "0")},${correct},${timestamp},${difficulties[difficultyIndex]}`);
    }
  }
  const output = resolve("data/mastery/synthetic-attempts.csv"); await mkdir(resolve(output, ".."), { recursive: true }); await writeFile(output, `${rows.join("\n")}\n`);
  console.log(JSON.stringify({ output, learners: 80, attempts: rows.length - 1, topics, warning: "Synthetic dataset: pipeline validation only, never report as student-model accuracy." }, null, 2));
}

void main();
