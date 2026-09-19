import { authenticate } from "@/lib/auth";
import { launchQuizWorkflow } from "@/lib/quiz-workflow";
import { z } from "zod";

const schema = z.object({ classId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), lectureSourceId: z.string().min(1).max(200), languages: z.array(z.string().min(2).max(20)).min(1).max(5), scheduledFor: z.string().datetime(), difficulty: z.enum(["easy", "medium", "hard"]), useOpenRouter: z.boolean().default(true) });

export async function POST(request: Request) {
  try {
    const actor = await authenticate(request); const input = schema.parse(await request.json());
    return Response.json(await launchQuizWorkflow(actor, input), { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return Response.json({ error: message }, { status: message.includes("authorized") ? 403 : 400 });
  }
}
