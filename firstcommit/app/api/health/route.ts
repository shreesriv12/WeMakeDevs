export const dynamic = "force-dynamic";
import { databaseHealth } from "@/lib/postgres";
import { runtimeStatus } from "@/lib/runtime-status";

export async function GET() {
  try { return Response.json({ status: "ok", service: "shikshamesh", database: await databaseHealth(), integrations: runtimeStatus(), timestamp: new Date().toISOString() }); }
  catch { return Response.json({ status:"degraded", service:"shikshamesh", database:"unavailable", integrations:runtimeStatus(), timestamp:new Date().toISOString() }, { status:503 }); }
}
