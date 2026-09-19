import type { Actor } from "./auth";
import { database, postgresEnabled } from "./postgres";
import { predictMasteryWithSageMaker, type MasteryAttempt } from "./aws/sagemaker-mastery";

type Question = { id: string; topic: string; prompt: string; options: string[]; answer: number; difficulty: "easy" | "medium" | "hard" };
const bank: Question[] = [
  { id:"tcp-1", topic:"transport_reliability", difficulty:"easy", prompt:"Which TCP mechanism confirms that data reached the receiver?", options:["Acknowledgement", "IP address", "Checksum only", "Routing table"], answer:0 },
  { id:"tcp-2", topic:"transport_reliability", difficulty:"medium", prompt:"What should TCP do after its retransmission timer expires without an acknowledgement?", options:["Discard the connection", "Retransmit the unacknowledged segment", "Change the IP address", "Stop flow control"], answer:1 },
  { id:"tcp-3", topic:"transport_reliability", difficulty:"hard", prompt:"Which feature prevents a fast sender from overwhelming a slower receiver?", options:["Sliding window flow control", "DNS", "MAC addressing", "Fragmentation"], answer:0 },
  { id:"ip-1", topic:"network_routing", difficulty:"easy", prompt:"Which layer is responsible for logical addressing and routing?", options:["Network layer", "Physical layer", "Presentation layer", "Session layer"], answer:0 }
];

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

export async function createAdaptiveAssessmentWithMastery(actor: Actor, count = 3) {
  const prediction = await learnerMastery(actor);
  const weakestTopic = Object.entries(prediction.mastery).sort((a, b) => a[1] - b[1])[0][0];
  const questions = bank.filter((question) => question.topic === weakestTopic).slice(0, Math.min(count, 10));
  return { assessmentId: `assessment-${crypto.randomUUID()}`, topic: weakestTopic, estimatedMastery: prediction.mastery[weakestTopic], masteryProvider: prediction.provider, modelVersion: prediction.modelVersion, questions: questions.map(({ answer: _, ...question }) => question) };
}

export function scoreAdaptiveAssessment(actor: Actor, answers: { questionId: string; answer: number }[]) {
  const permitted = new Map(bank.map((question) => [question.id, question]));
  const evaluated = answers.slice(0, 10).flatMap((attempt) => { const question = permitted.get(attempt.questionId); return question ? [{ questionId:question.id, correct:question.answer === attempt.answer, topic:question.topic, difficulty:question.difficulty }] : []; });
  const correct = evaluated.filter((result) => result.correct).length;
  return { actorId:actor.id, attempted:evaluated.length, correct, score:evaluated.length ? Math.round((correct / evaluated.length) * 100) : 0, results:evaluated };
}
