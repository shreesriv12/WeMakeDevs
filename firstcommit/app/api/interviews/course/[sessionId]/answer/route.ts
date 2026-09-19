import { authenticate } from "@/lib/auth";
import { answerCourseInterview } from "@/lib/course-interview-agent";
import { z } from "zod";

const schema = z.object({ questionId: z.string().min(1).max(80), answer: z.string().min(10).max(4000) });
export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try { const actor = await authenticate(request); const input = schema.parse(await request.json()); return Response.json(await answerCourseInterview(actor, (await params).sessionId, input.questionId, input.answer)); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to score interview answer" }, { status: 400 }); }
}
