import type { Actor } from "./auth";
import { database, postgresEnabled } from "./postgres";

export type LessonInput = { classId: string; title: string; scheduledFor: string; durationMinutes: number; agenda: string[] };

async function ensureActorScope(actor: Actor, classId: string) {
  const client = database();
  await client.query("INSERT INTO institutions (id,name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING", [actor.institutionId, actor.institutionId]);
  await client.query("INSERT INTO users (id,institution_id,role,display_name) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET display_name=COALESCE(EXCLUDED.display_name,users.display_name)", [actor.id, actor.institutionId, actor.role, actor.displayName ?? null]);
  await client.query("INSERT INTO classes (id,institution_id,name) VALUES ($1,$2,$3) ON CONFLICT (institution_id,id) DO NOTHING", [classId, actor.institutionId, classId]);
  await client.query("INSERT INTO class_memberships (institution_id,class_id,user_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [actor.institutionId, classId, actor.id]);
}

function canTeach(actor: Actor, classId: string) { return (actor.role === "teacher" || actor.role === "admin") && (actor.role === "admin" || actor.classIds.includes(classId)); }

export async function createLiveLesson(actor: Actor, input: LessonInput) {
  if (!canTeach(actor, input.classId)) throw new Error("Not authorized to schedule a lesson for this class");
  if (!postgresEnabled()) throw new Error("Live lesson scheduling requires PostgreSQL");
  await ensureActorScope(actor, input.classId);
  const id = crypto.randomUUID();
  await database().query("INSERT INTO live_rooms (id,institution_id,class_id,title,created_by,slug,scheduled_for,duration_minutes,status,agenda) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'scheduled',$9)", [id, actor.institutionId, input.classId, input.title, actor.id, `lesson-${id}`, input.scheduledFor, input.durationMinutes, JSON.stringify(input.agenda)]);
  return { id, ...input, status: "scheduled" as const };
}

export async function listLiveLessons(actor: Actor, classId: string) {
  if (!actor.classIds.includes(classId) && actor.role !== "admin") throw new Error("Not authorized for this class");
  if (!postgresEnabled()) return [];
  const result = await database().query<{ id:string; title:string; scheduled_for:Date|null; duration_minutes:number|null; status:"scheduled"|"live"|"ended"|"cancelled"; agenda:string[]; display_name:string|null }>("SELECT r.id,r.title,r.scheduled_for,r.duration_minutes,r.status,r.agenda,u.display_name FROM live_rooms r LEFT JOIN users u ON u.id=r.created_by WHERE r.institution_id=$1 AND r.class_id=$2 ORDER BY r.scheduled_for DESC NULLS LAST LIMIT 50", [actor.institutionId, classId]);
  return result.rows.map((row) => ({ id: row.id, title: row.title, scheduledFor: row.scheduled_for?.toISOString(), durationMinutes: row.duration_minutes, status: row.status, agenda: Array.isArray(row.agenda) ? row.agenda : [], teacherName: row.display_name ?? "Teacher" }));
}
