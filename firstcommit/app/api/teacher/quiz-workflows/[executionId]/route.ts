import { authenticate } from "@/lib/auth";
import { getQuizWorkflowRun } from "@/lib/quiz-workflow";

export async function GET(request: Request, { params }: { params: Promise<{ executionId: string }> }) {
  try {
    const actor = await authenticate(request);
    const { executionId } = await params;
    return Response.json(await getQuizWorkflowRun(actor, decodeURIComponent(executionId)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load quiz workflow";
    return Response.json({ error: message }, { status: message.includes("authorized") || message.includes("not found") ? 403 : 400 });
  }
}
