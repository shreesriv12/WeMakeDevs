import { authenticate } from "@/lib/auth";
import { createAdaptiveAssessmentWithMastery } from "@/lib/adaptive-assessment";
import { z } from "zod";

const schema = z.object({ count:z.number().int().min(1).max(10).default(3), context:z.string().trim().max(2000).optional() });
export async function POST(request: Request) {
  try { const actor = await authenticate(request); const input = schema.parse(await request.json()); return Response.json(await createAdaptiveAssessmentWithMastery(actor, input.count, input.context)); }
  catch (error) { return Response.json({ error:error instanceof Error ? error.message : "Invalid request" }, { status:400 }); }
}
