import type { Actor } from "./auth";
import { database, postgresEnabled } from "./postgres";

type AssessmentResult = { questionId?: string; topic: string; difficulty?: "easy" | "medium" | "hard"; correct: boolean };

async function ensureActorScope(actor: Actor, classId: string) {
  const client = database();
  await client.query("INSERT INTO institutions (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", [actor.institutionId, "ShikshaMesh institution"]);
  await client.query("INSERT INTO users (id, institution_id, role) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET institution_id = EXCLUDED.institution_id, role = EXCLUDED.role", [actor.id, actor.institutionId, actor.role]);
  await client.query("INSERT INTO classes (id, institution_id, name) VALUES ($1, $2, $3) ON CONFLICT (institution_id, id) DO NOTHING", [classId, actor.institutionId, classId]);
  await client.query("INSERT INTO class_memberships (institution_id, class_id, user_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [actor.institutionId, classId, actor.id]);
}

export async function persistAssessmentResults(actor: Actor, results: AssessmentResult[]) {
  if (!postgresEnabled() || results.length === 0) return { provider: "memory" as const };
  const classId = actor.classIds[0];
  if (!classId) return { provider: "memory" as const };
  try {
    await ensureActorScope(actor, classId);
    const client = database();
    for (const result of results) {
      await client.query("INSERT INTO assessment_attempts (id, student_id, institution_id, class_id, topic, question_id, difficulty, score) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [crypto.randomUUID(), actor.id, actor.institutionId, classId, result.topic, result.questionId ?? "legacy-question", result.difficulty ?? "medium", result.correct ? 100 : 0]);
    }
    return { provider: "postgres" as const };
  } catch {
    return { provider: "memory" as const };
  }
}
