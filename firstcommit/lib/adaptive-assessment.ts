import type { Actor } from "./auth";
import { database, postgresEnabled } from "./postgres";
import { predictMasteryWithSageMaker, type MasteryAttempt } from "./aws/sagemaker-mastery";

type Question = { id: string; topic: string; prompt: string; options: string[]; answer: number; difficulty: "easy" | "medium" | "hard" };
const bank: Question[] = [
  { id:"library-1", topic:"library_management", difficulty:"easy", prompt:"Why does the library keep Books and BookCopies as separate tables?", options:["To duplicate every record", "To separate title metadata from each physical copy's status", "To remove accession numbers", "To avoid tracking returns"], answer:1 },
  { id:"library-2", topic:"library_management", difficulty:"medium", prompt:"Which checks are required before issuing a physical book copy?", options:["Only the title must exist", "Only the member name is needed", "Active membership, issue limit, copy availability, and blocking rules", "Only the fine amount matters"], answer:2 },
  { id:"library-3", topic:"library_management", difficulty:"hard", prompt:"Why should creating an issue and changing the copy status happen in one database transaction?", options:["To prevent inconsistent borrowing and availability records", "To delete transaction history", "To bypass membership checks", "To allow two simultaneous issues of the same copy"], answer:0 },
  { id:"library-4", topic:"library_management", difficulty:"medium", prompt:"According to the report, when should renewal be blocked?", options:["Whenever a book has multiple authors", "When the member searches the catalog", "Whenever the copy has a shelf number", "When another member has reserved the book"], answer:3 },
  { id:"library-5", topic:"library_management", difficulty:"easy", prompt:"How does the report define an overdue fine?", options:["Book price multiplied by total copies", "Overdue days multiplied by the configured daily rate", "A fixed amount for every return", "Number of authors multiplied by loan days"], answer:1 },
  { id:"tcp-1", topic:"transport_reliability", difficulty:"easy", prompt:"Which TCP mechanism confirms that data reached the receiver?", options:["Acknowledgement", "IP address", "Checksum only", "Routing table"], answer:0 },
  { id:"tcp-2", topic:"transport_reliability", difficulty:"medium", prompt:"What should TCP do after its retransmission timer expires without an acknowledgement?", options:["Discard the connection", "Retransmit the unacknowledged segment", "Change the IP address", "Stop flow control"], answer:1 },
  { id:"tcp-3", topic:"transport_reliability", difficulty:"hard", prompt:"Which feature prevents a fast sender from overwhelming a slower receiver?", options:["Sliding window flow control", "DNS", "MAC addressing", "Fragmentation"], answer:0 },
  { id:"ip-1", topic:"network_routing", difficulty:"easy", prompt:"Which layer is responsible for logical addressing and routing?", options:["Network layer", "Physical layer", "Presentation layer", "Session layer"], answer:0 },
  { id:"binary-1", topic:"binary_lifting", difficulty:"easy", prompt:"What does up[v][j] represent in binary lifting?", options:["The 2^j-th ancestor of node v", "The depth of node v", "The number of children of node v", "The shortest path from v"], answer:0 },
  { id:"binary-2", topic:"binary_lifting", difficulty:"medium", prompt:"How can the binary representation of k help find a node's k-th ancestor?", options:["Lift the node for every set bit of k", "Run BFS k times", "Sort all node depths", "Only use the largest power of two"], answer:0 },
  { id:"binary-3", topic:"binary_lifting", difficulty:"hard", prompt:"Why is the root commonly made its own parent in the up table?", options:["It makes jumps above the root safe and well-defined", "It reduces the tree height", "It removes DFS", "It makes every node a root"], answer:0 }
];

function topicFromContext(context?: string) {
  const value = context?.toLowerCase() ?? "";
  if (/library|bookcopies|book (issue|return)|catalog|overdue fine/.test(value)) return "library_management";
  if (/binary\s*lifting|k-th ancestor|\blca\b/.test(value)) return "binary_lifting";
  if (/routing|ip address|network layer/.test(value)) return "network_routing";
  return "transport_reliability";
}

function masteryFor(actor: Actor): Record<string, number> {
  // Development baseline; replace with the SageMaker knowledge-tracing endpoint.
  return actor.id === "student-391" ? { transport_reliability: 0.46, network_routing: 0.73 } : { transport_reliability: 0.60, network_routing: 0.60 };
}

export async function learnerMastery(actor: Actor) {
  const fallback = masteryFor(actor);
  if (!postgresEnabled()) return { mastery: fallback, provider: "deterministic" as const };
  try {
    const rows = await database().query<{ topic: string; question_id: string; difficulty: "easy" | "medium" | "hard"; score: number }>("SELECT topic, question_id, difficulty, score FROM assessment_attempts WHERE institution_id = $1 AND student_id = $2 ORDER BY submitted_at ASC LIMIT 200", [actor.institutionId, actor.id]);
    if (!rows.rows.length) return { mastery: fallback, provider: "deterministic" as const };
    const attempts: MasteryAttempt[] = rows.rows.map((row) => ({ topicId: row.topic, questionId: row.question_id, correct: row.score >= 50, difficulty: row.difficulty }));
    if (process.env.ENABLE_SAGEMAKER_MASTERY === "true" && process.env.SAGEMAKER_MASTERY_ENDPOINT) {
      try { const predicted = await predictMasteryWithSageMaker(attempts); return { mastery: { ...fallback, ...predicted.mastery }, provider: "sagemaker-dkt" as const, modelVersion: predicted.modelVersion }; }
      catch { /* Empirical tenant-scoped history is the safe fallback. */ }
    }
    const totals = new Map<string, { correct: number; total: number }>();
    for (const attempt of attempts) { const current = totals.get(attempt.topicId) ?? { correct: 0, total: 0 }; current.correct += attempt.correct ? 1 : 0; current.total += 1; totals.set(attempt.topicId, current); }
    const mastery = { ...fallback };
    for (const [topic, result] of totals) mastery[topic] = (result.correct + 3) / (result.total + 5);
    return { mastery, provider: "postgres-history" as const };
  } catch { return { mastery: fallback, provider: "deterministic" as const }; }
}

export function createAdaptiveAssessment(actor: Actor, count = 3) {
  const mastery = masteryFor(actor);
  const weakestTopic = Object.entries(mastery).sort((a, b) => a[1] - b[1])[0][0];
  const questions = bank.filter((question) => question.topic === weakestTopic).slice(0, Math.min(count, 10));
  return { assessmentId: `assessment-${crypto.randomUUID()}`, topic: weakestTopic, estimatedMastery: mastery[weakestTopic], questions: questions.map(({ answer: _, ...question }) => question) };
}

export async function createAdaptiveAssessmentWithMastery(actor: Actor, count = 3, context?: string) {
  const prediction = await learnerMastery(actor);
  const contextualTopic = topicFromContext(context);
  const weakestTopic = bank.some((question) => question.topic === contextualTopic) ? contextualTopic : Object.entries(prediction.mastery).sort((a, b) => a[1] - b[1])[0][0];
  const questions = bank.filter((question) => question.topic === weakestTopic).slice(0, Math.min(count, 10));
  return { assessmentId: `assessment-${crypto.randomUUID()}`, topic: weakestTopic, estimatedMastery: prediction.mastery[weakestTopic] ?? 0.6, masteryProvider: prediction.provider, modelVersion: prediction.modelVersion, questions: questions.map(({ answer: _, ...question }) => question) };
}

export function scoreAdaptiveAssessment(actor: Actor, answers: { questionId: string; answer: number }[]) {
  const permitted = new Map(bank.map((question) => [question.id, question]));
  const evaluated = answers.slice(0, 10).flatMap((attempt) => { const question = permitted.get(attempt.questionId); return question ? [{ questionId:question.id, correct:question.answer === attempt.answer, topic:question.topic, difficulty:question.difficulty }] : []; });
  const correct = evaluated.filter((result) => result.correct).length;
  return { actorId:actor.id, attempted:evaluated.length, correct, score:evaluated.length ? Math.round((correct / evaluated.length) * 100) : 0, results:evaluated };
}
