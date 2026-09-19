import { authenticate } from "@/lib/auth";
import { scoreAdaptiveAssessment } from "@/lib/adaptive-assessment";
import { persistAssessmentResults } from "@/lib/assessment-store";
import { z } from "zod";

const schema = z.object({ answers:z.array(z.object({ questionId:z.string().max(80), answer:z.number().int().min(0).max(10) })).max(10) });
export async function POST(request: Request) {
  try { const actor = await authenticate(request); const input = schema.parse(await request.json()); const scored = scoreAdaptiveAssessment(actor, input.answers); const persistence = await persistAssessmentResults(actor, scored.results); return Response.json({ ...scored, persistence }); }
  catch (error) { return Response.json({ error:error instanceof Error ? error.message : "Invalid request" }, { status:400 }); }
}
