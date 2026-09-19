import { authenticate } from "@/lib/auth";
import { approveIntervention, recommendIntervention } from "@/lib/teacher-intervention";
import { z } from "zod";

const schema = z.object({ classId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), concept: z.string().trim().min(2).max(160) });
const approvalSchema = z.object({ interventionId: z.string().uuid() });
export async function POST(request: Request) {
  try { const actor = await authenticate(request); const input = schema.parse(await request.json()); return Response.json(await recommendIntervention(actor, input.classId, input.concept)); }
  catch (error) { const message = error instanceof Error ? error.message : "Unable to recommend intervention"; return Response.json({ error: message }, { status: message.includes("authorized") ? 403 : 400 }); }
}
export async function PATCH(request: Request) {
  try { const actor = await authenticate(request); const input = approvalSchema.parse(await request.json()); return Response.json(await approveIntervention(actor, input.interventionId)); }
  catch (error) { const message = error instanceof Error ? error.message : "Unable to approve intervention"; return Response.json({ error: message }, { status: message.includes("authorized") ? 403 : 400 }); }
}
