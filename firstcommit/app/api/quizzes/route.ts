import { authenticate } from "@/lib/auth";
import { listPublishedQuizzes } from "@/lib/quiz-store";
export async function GET(request: Request) { try { const actor = await authenticate(request); const classId = new URL(request.url).searchParams.get("classId"); if (!classId) throw new Error("classId is required"); return Response.json({ quizzes: await listPublishedQuizzes(actor, classId) }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to load quizzes" }, { status: 400 }); } }
