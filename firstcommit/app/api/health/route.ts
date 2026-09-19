export const dynamic = "force-dynamic";
import { databaseHealth } from "@/lib/postgres";
import { runtimeStatus } from "@/lib/runtime-status";
import { deploymentSafety } from "@/lib/deployment-safety";

export async function GET() {
  const safety=deploymentSafety();
  try { const database=await databaseHealth(); const healthy=safety.ready; return Response.json({ status:healthy?"ok":"degraded", service:"shikshamesh", database, integrations:runtimeStatus(), safety, timestamp:new Date().toISOString() }, { status:healthy?200:503 }); }
  catch { return Response.json({ status:"degraded", service:"shikshamesh", database:"unavailable", integrations:runtimeStatus(), safety, timestamp:new Date().toISOString() }, { status:503 }); }
}
