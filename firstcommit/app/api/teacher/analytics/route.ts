import { authenticate } from "@/lib/auth";
import { classWeakConcepts } from "@/lib/class-analytics";
import { z } from "zod";

const schema = z.object({ classId:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), threshold:z.number().min(0).max(1).default(0.4) });
export async function POST(request: Request) {
  try { const actor = await authenticate(request); const input = schema.parse(await request.json()); return Response.json(await classWeakConcepts(actor, input.classId, input.threshold)); }
  catch (error) { const message = error instanceof Error ? error.message : "Invalid request"; return Response.json({ error:message }, { status:message.includes("authorized") ? 403 : 400 }); }
}
