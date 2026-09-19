import type { Actor } from "./auth";
import { classWeakConcepts } from "./class-analytics";
import { database, postgresEnabled } from "./postgres";

export type Intervention = { id: string; classId: string; concept: string; strugglingLearners: number; learnersAttempted: number; struggleRate: number; requiresTeacherApproval: boolean; plan: string[]; safety: string; status: "recommended" | "approved" };

export async function recommendIntervention(actor: Actor, classId: string, concept: string): Promise<Intervention> {
  const analytics = await classWeakConcepts(actor, classId, 0.4);
  const signal = analytics.concepts.find((item) => item.concept.toLowerCase() === concept.toLowerCase());
  if (!signal) throw new Error("No threshold-exceeding class signal exists for this concept");
  const intervention: Intervention = { id: crypto.randomUUID(), classId, concept: signal.concept, strugglingLearners: signal.strugglingLearners, learnersAttempted: signal.learnersAttempted, struggleRate: signal.struggleRate, requiresTeacherApproval: true, plan: ["An 8-minute concept explanation in the selected class language", "One visual worked example", "Three remedial adaptive questions", "A follow-up re-test after 24 hours"], safety: "Nothing is sent to students until the teacher approves a separate workflow request.", status: "recommended" };
  if (postgresEnabled()) await database().query(`INSERT INTO teacher_interventions (id, institution_id, class_id, concept, created_by, plan, signal) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`, [intervention.id, actor.institutionId, classId, intervention.concept, actor.id, JSON.stringify(intervention.plan), JSON.stringify({ strugglingLearners: intervention.strugglingLearners, learnersAttempted: intervention.learnersAttempted, struggleRate: intervention.struggleRate })]);
  return intervention;
}

export async function approveIntervention(actor: Actor, interventionId: string) {
  if (actor.role !== "teacher" && actor.role !== "admin") throw new Error("Not authorized to approve interventions");
  if (!postgresEnabled()) throw new Error("PostgreSQL is required to approve and track interventions");
  const result = await database().query<{ id: string; class_id: string; concept: string }>(`UPDATE teacher_interventions SET status = 'approved', approved_at = NOW() WHERE id = $1 AND institution_id = $2 AND ($3 = 'admin' OR class_id = ANY($4::text[])) RETURNING id, class_id, concept`, [interventionId, actor.institutionId, actor.role, actor.classIds]);
  if (!result.rowCount) throw new Error("Intervention was not found or you are not authorized for its class");
  return { ...result.rows[0], status: "approved" as const, delivery: "approved-and-tracked", message: "Intervention approved. The plan is recorded for the class; student delivery remains a separately governed workflow." };
}
