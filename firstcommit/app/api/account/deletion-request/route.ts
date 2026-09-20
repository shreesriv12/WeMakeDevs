import { randomUUID } from "crypto";
import { authenticate } from "@/lib/auth";
import { database, postgresEnabled } from "@/lib/postgres";

export async function POST(request: Request) {
  try {
    const actor = await authenticate(request);
    if (!postgresEnabled()) return Response.json({ error: "Account deletion requests require PostgreSQL." }, { status: 503 });

    await database().query(
      "INSERT INTO account_deletion_requests (id, institution_id, user_id, status) VALUES ($1,$2,$3,'requested') ON CONFLICT (institution_id,user_id,status) DO NOTHING",
      [randomUUID(), actor.institutionId, actor.id]
    );
    await database().query(
      "UPDATE mastery_training_consents SET revoked_at=now() WHERE institution_id=$1 AND user_id=$2 AND revoked_at IS NULL",
      [actor.institutionId, actor.id]
    );
    return Response.json({ status: "requested", message: "Deletion request recorded and research consent withdrawn." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to request account deletion" }, { status: 400 });
  }
}
