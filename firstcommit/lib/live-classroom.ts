import type { Actor } from "./auth";
import { database, postgresEnabled } from "./postgres";

export type LiveAttachment = { type: "canvas" | "code" | "geometry" | "document" | "diagram"; objectId: string };
export type LiveMessage = { id: string; senderName: string; senderRole: string; text: string; attachment?: LiveAttachment; createdAt: string };

async function ensureActorScope(actor: Actor, classId: string) {
  const client = database();
  await client.query("INSERT INTO institutions (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", [actor.institutionId, actor.institutionId]);
  await client.query("INSERT INTO users (id, institution_id, role, display_name) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET institution_id=EXCLUDED.institution_id, role=EXCLUDED.role, display_name=COALESCE(EXCLUDED.display_name, users.display_name)", [actor.id, actor.institutionId, actor.role, actor.displayName ?? null]);
  await client.query("INSERT INTO classes (id, institution_id, name) VALUES ($1, $2, $3) ON CONFLICT (institution_id, id) DO NOTHING", [classId, actor.institutionId, classId]);
  await client.query("INSERT INTO class_memberships (institution_id, class_id, user_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [actor.institutionId, classId, actor.id]);
}

function assertClassAccess(actor: Actor, classId: string) {
  if (!actor.classIds.includes(classId) && actor.role !== "admin") throw new Error("Not authorized for this classroom");
}

async function durableRoomId(actor: Actor, classId: string, roomKey: string) {
  assertClassAccess(actor, classId);
  await ensureActorScope(actor, classId);
  const client = database();
  const existing = await client.query<{ id: string }>("SELECT id FROM live_rooms WHERE institution_id=$1 AND class_id=$2 AND slug=$3", [actor.institutionId, classId, roomKey]);
  if (existing.rows[0]) return existing.rows[0].id;
  const id = crypto.randomUUID();
  await client.query("INSERT INTO live_rooms (id, institution_id, class_id, title, created_by, slug) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING", [id, actor.institutionId, classId, `${classId} live room`, actor.id, roomKey]);
  const created = await client.query<{ id: string }>("SELECT id FROM live_rooms WHERE institution_id=$1 AND class_id=$2 AND slug=$3", [actor.institutionId, classId, roomKey]);
  if (!created.rows[0]) throw new Error("Could not create live room");
  return created.rows[0].id;
}

function safeAttachment(value: unknown): LiveAttachment | undefined {
  if (!value || typeof value !== "object") return undefined;
  const attachment = value as { type?: unknown; objectId?: unknown };
  if (!["canvas", "code", "geometry", "document", "diagram"].includes(String(attachment.type)) || typeof attachment.objectId !== "string" || !attachment.objectId.trim() || attachment.objectId.length > 200) return undefined;
  return { type: attachment.type as LiveAttachment["type"], objectId: attachment.objectId.trim() };
}

export async function liveRoomMessages(actor: Actor, classId: string, roomKey: string): Promise<LiveMessage[]> {
  if (!postgresEnabled()) return [];
  const roomId = await durableRoomId(actor, classId, roomKey);
  const rows = await database().query<{ id:string; sender_role:string; sender_name:string|null; text:string; attachment_type:LiveAttachment["type"]|null; attachment_object_id:string|null; created_at:Date }>("SELECT m.id,m.sender_role,u.display_name AS sender_name,m.text,m.attachment_type,m.attachment_object_id,m.created_at FROM live_messages m LEFT JOIN users u ON u.id=m.sender_id WHERE m.room_id=$1 ORDER BY m.created_at ASC LIMIT 100", [roomId]);
  return rows.rows.map((row) => ({ id: row.id, senderName: row.sender_name ?? row.sender_role, senderRole: row.sender_role, text: row.text, attachment: row.attachment_type && row.attachment_object_id ? { type: row.attachment_type, objectId: row.attachment_object_id } : undefined, createdAt: row.created_at.toISOString() }));
}

export async function persistLiveMessage(actor: Actor, input: { classId: string; roomKey: string; text: string; attachment?: unknown }): Promise<LiveMessage> {
  const text = input.text.trim();
  if (!text || text.length > 2000) throw new Error("Invalid live message");
  const attachment = safeAttachment(input.attachment);
  const message: LiveMessage = { id: crypto.randomUUID(), senderName: actor.displayName ?? "Learner", senderRole: actor.role, text, attachment, createdAt: new Date().toISOString() };
  if (!postgresEnabled()) return message;
  const roomId = await durableRoomId(actor, input.classId, input.roomKey);
  await database().query("INSERT INTO live_messages (id, room_id, sender_id, sender_role, text, attachment_type, attachment_object_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [message.id, roomId, actor.id, actor.role, text, attachment?.type ?? null, attachment?.objectId ?? null, message.createdAt]);
  return message;
}

export async function recordLiveAttendance(actor: Actor, input: { classId: string; roomKey: string; event: "joined" | "left" }) {
  if (!postgresEnabled()) return;
  const roomId = await durableRoomId(actor, input.classId, input.roomKey);
  if (input.event === "joined") await database().query("INSERT INTO live_attendance (room_id,user_id,first_joined_at,last_seen_at,left_at) VALUES ($1,$2,now(),now(),NULL) ON CONFLICT (room_id,user_id) DO UPDATE SET last_seen_at=now(), left_at=NULL", [roomId, actor.id]);
  else await database().query("UPDATE live_attendance SET last_seen_at=now(), left_at=now() WHERE room_id=$1 AND user_id=$2", [roomId, actor.id]);
}

export async function liveAttendance(actor: Actor, classId: string, roomKey: string) {
  if (actor.role !== "teacher" && actor.role !== "admin") throw new Error("Teacher access is required for attendance");
  if (actor.role !== "admin" && !actor.classIds.includes(classId)) throw new Error("Not authorized for this class");
  if (!postgresEnabled()) return [];
  const roomId = await durableRoomId(actor, classId, roomKey);
  const rows = await database().query<{ user_id:string; display_name:string|null; role:string; first_joined_at:Date; last_seen_at:Date; left_at:Date|null }>("SELECT a.user_id,u.display_name,u.role,a.first_joined_at,a.last_seen_at,a.left_at FROM live_attendance a JOIN users u ON u.id=a.user_id WHERE a.room_id=$1 ORDER BY a.first_joined_at DESC", [roomId]);
  return rows.rows.map((row) => ({ userId: row.user_id, displayName: row.display_name ?? "Learner", role: row.role, firstJoinedAt: row.first_joined_at.toISOString(), lastSeenAt: row.last_seen_at.toISOString(), leftAt: row.left_at?.toISOString(), status: row.left_at ? "left" : "present" }));
}
