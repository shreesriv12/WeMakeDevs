import { authenticate } from "@/lib/auth";
import { submitQuiz } from "@/lib/quiz-store";
import { z } from "zod";
const schema = z.object({ answers: z.array(z.object({ questionId: z.string().uuid(), selectedOption: z.number().int().min(0).max(3) })).min(1).max(50) });
export async function POST(request: Request, { params }: { params: Promise<{ quizId: string }> }) { try { const actor = await authenticate(request); return Response.json(await submitQuiz(actor, (await params).quizId, schema.parse(await request.json()).answers)); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to submit quiz" }, { status: 400 }); } }
