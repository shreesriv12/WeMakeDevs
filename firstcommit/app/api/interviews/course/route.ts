import { authenticate } from "@/lib/auth";
import { startCourseInterview } from "@/lib/course-interview-agent";
import { listCourseInterviews } from "@/lib/course-interview-agent";
import { z } from "zod";

const schema = z.object({ classId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), focus: z.string().min(2).max(500) });
export async function POST(request: Request) {
  try { const actor = await authenticate(request); return Response.json(await startCourseInterview(actor, schema.parse(await request.json()))); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to start interview" }, { status: 400 }); }
}
export async function GET(request: Request) { try { return Response.json({ interviews: await listCourseInterviews(await authenticate(request)) }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to load interviews" }, { status: 400 }); } }
