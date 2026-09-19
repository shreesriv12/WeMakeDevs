import { authenticate } from "@/lib/auth";
import { database, postgresEnabled } from "@/lib/postgres";
import { createHmac } from "node:crypto";

function csv(value: string) { return `"${value.replaceAll('"', '""')}"`; }

export async function GET(request: Request) {
  try {
    const actor = await authenticate(request);
    if (actor.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
    if (!postgresEnabled()) return Response.json({ error: "PostgreSQL is not configured" }, { status: 503 });
    const salt = process.env.ML_PSEUDONYMIZATION_SALT;
    if (!salt || salt.length < 24) return Response.json({ error: "ML_PSEUDONYMIZATION_SALT must be configured with at least 24 characters" }, { status: 503 });
    const result = await database().query<{ student_id: string; topic: string; question_id: string | null; difficulty: string | null; score: number; submitted_at: Date }>("SELECT a.student_id,a.topic,a.question_id,a.difficulty,a.score,a.submitted_at FROM assessment_attempts a JOIN mastery_training_consents c ON c.institution_id=a.institution_id AND c.user_id=a.student_id AND c.revoked_at IS NULL WHERE a.institution_id = $1 ORDER BY a.student_id,a.submitted_at", [actor.institutionId]);
    const rows = result.rows.map((row) => [
      createHmac("sha256", salt).update(`${actor.institutionId}:${row.student_id}`).digest("hex").slice(0, 32),
      row.topic,
      row.question_id ?? "legacy-question",
      row.score >= 50 ? "1" : "0",
      row.submitted_at.toISOString(),
      row.difficulty ?? "medium"
    ]);
    const body = `${["learner_id", "topic_id", "question_id", "is_correct", "occurred_at", "difficulty"].map(csv).join(",")}\n${rows.map((row) => row.map(csv).join(",")).join("\n")}\n`;
    return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=mastery-training-events.csv", "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to export mastery events" }, { status: 400 });
  }
}
