import type { Actor } from "./auth";
import { database, postgresEnabled } from "./postgres";

async function ensureActorScope(actor: Actor, classId: string) {
  const client = database();
  await client.query("INSERT INTO institutions (id,name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING", [actor.institutionId, actor.institutionId]);
  await client.query("INSERT INTO users (id,institution_id,role,display_name) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET display_name=COALESCE(EXCLUDED.display_name,users.display_name)", [actor.id, actor.institutionId, actor.role, actor.displayName ?? null]);
  await client.query("INSERT INTO classes (id,institution_id,name) VALUES ($1,$2,$3) ON CONFLICT (institution_id,id) DO NOTHING", [classId, actor.institutionId, classId]);
  await client.query("INSERT INTO class_memberships (institution_id,class_id,user_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING", [actor.institutionId, classId, actor.id]);
}

function authorized(actor: Actor, classId: string) {
  if (!actor.classIds.includes(classId) && actor.role !== "admin") throw new Error("Not authorized for this canvas workspace");
}

export async function loadSharedCanvas(actor: Actor, classId: string, workspaceKey: string) {
  authorized(actor, classId);
  if (!postgresEnabled()) return { state: [], updatedAt: undefined as string | undefined };
  await ensureActorScope(actor, classId);
  const result = await database().query<{ state: unknown; updated_at: Date }>("SELECT state,updated_at FROM shared_canvas_workspaces WHERE institution_id=$1 AND class_id=$2 AND workspace_key=$3", [actor.institutionId, classId, workspaceKey]);
  return { state: Array.isArray(result.rows[0]?.state) ? result.rows[0].state : [], updatedAt: result.rows[0]?.updated_at.toISOString() };
}

export async function saveSharedCanvas(actor: Actor, input: { classId: string; workspaceKey: string; state: unknown[] }) {
  authorized(actor, input.classId);
  if (!postgresEnabled()) return { saved: false, updatedAt: undefined as string | undefined };
  const encoded = JSON.stringify(input.state);
  if (encoded.length > 1_000_000) throw new Error("Canvas is too large to save");
  await ensureActorScope(actor, input.classId);
  const updatedAt = new Date().toISOString();
  await database().query("INSERT INTO shared_canvas_workspaces (id,institution_id,class_id,workspace_key,state,updated_by,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (institution_id,class_id,workspace_key) DO UPDATE SET state=EXCLUDED.state, updated_by=EXCLUDED.updated_by, updated_at=EXCLUDED.updated_at", [crypto.randomUUID(), actor.institutionId, input.classId, input.workspaceKey, encoded, actor.id, updatedAt]);
  return { saved: true, updatedAt };
}
