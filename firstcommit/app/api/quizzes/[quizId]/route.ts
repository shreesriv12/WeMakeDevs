import { authenticate } from "@/lib/auth";
import { getQuizForStudent } from "@/lib/quiz-store";
export async function GET(request: Request, { params }: { params: Promise<{ quizId: string }> }) { try { const actor = await authenticate(request); return Response.json(await getQuizForStudent(actor, (await params).quizId)); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to load quiz" }, { status: 400 }); } }
