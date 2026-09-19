import type { Actor } from "./auth";
import { database, postgresEnabled } from "./postgres";

export type CourseDocument = { id: string; classId: string; sourceName: string; contentType: string; ingestionStatus: string; createdAt: string };

async function ensureActorScope(actor: Actor, classId: string) {
  const client = database();
  await client.query("INSERT INTO institutions (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", [actor.institutionId, "ShikshaMesh institution"]);
  await client.query("INSERT INTO users (id, institution_id, role) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET institution_id = EXCLUDED.institution_id, role = EXCLUDED.role", [actor.id, actor.institutionId, actor.role]);
  await client.query("INSERT INTO classes (id, institution_id, name) VALUES ($1, $2, $3) ON CONFLICT (institution_id, id) DO NOTHING", [classId, actor.institutionId, classId]);
  await client.query("INSERT INTO class_memberships (institution_id, class_id, user_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [actor.institutionId, classId, actor.id]);
}

export async function recordCourseDocument(actor: Actor, input: { id: string; classId: string; sourceKey: string; sourceName: string; contentType: string; ingestionStatus: string; ingestionJobId?: string }) {
  if (!postgresEnabled()) return { provider: "memory" as const };
  await ensureActorScope(actor, input.classId);
  await database().query("INSERT INTO course_documents (id, institution_id, class_id, s3_key, source_name, content_type, ingestion_status, ingestion_job_id, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO UPDATE SET ingestion_status = EXCLUDED.ingestion_status, ingestion_job_id = EXCLUDED.ingestion_job_id", [input.id, actor.institutionId, input.classId, input.sourceKey, input.sourceName, input.contentType, input.ingestionStatus, input.ingestionJobId ?? null, actor.id]);
  return { provider: "postgres" as const };
}

export async function updateCourseDocumentIngestion(actor: Actor, documentId: string, ingestionJobId: string, status: string) {
  if (!postgresEnabled()) return;
  const result = await database().query("UPDATE course_documents SET ingestion_status = $3, ingestion_job_id = $2 WHERE id = $1 AND institution_id = $4 AND (created_by = $5 OR $6 = 'admin')", [documentId, ingestionJobId, status, actor.institutionId, actor.id, actor.role]);
  if (!result.rowCount) throw new Error("Course document not found");
}

export async function listCourseDocuments(actor: Actor, classId: string): Promise<CourseDocument[]> {
  if (!actor.classIds.includes(classId) && actor.role !== "admin") throw new Error("Not authorized for this class");
  if (!postgresEnabled()) return [];
  const rows = await database().query<{ id: string; class_id: string; source_name: string; content_type: string; ingestion_status: string; created_at: Date }>("SELECT id, class_id, source_name, content_type, ingestion_status, created_at FROM course_documents WHERE institution_id = $1 AND class_id = $2 ORDER BY created_at DESC LIMIT 50", [actor.institutionId, classId]);
  return rows.rows.map((row) => ({ id: row.id, classId: row.class_id, sourceName: row.source_name, contentType: row.content_type, ingestionStatus: row.ingestion_status, createdAt: row.created_at.toISOString() }));
}
