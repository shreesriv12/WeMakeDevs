import { authenticate } from "@/lib/auth";
import { explainItBack } from "@/lib/concept-xray";
import { z } from "zod";

const schema = z.object({ response: z.string().trim().min(12).max(5000) });

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await context.params;
    return Response.json(await explainItBack(await authenticate(request), sessionId, schema.parse(await request.json()).response));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to evaluate explanation" }, { status: 400 }); }
}
