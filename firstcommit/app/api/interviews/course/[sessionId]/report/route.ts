import { authenticate } from "@/lib/auth";
import { courseInterviewReport } from "@/lib/course-interview-agent";

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try { const actor = await authenticate(request); return Response.json(await courseInterviewReport(actor, (await params).sessionId)); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to load interview report" }, { status: 400 }); }
}
