import { authenticate } from "@/lib/auth";
import { createConceptXRay } from "@/lib/concept-xray";
import { z } from "zod";

const schema = z.object({ classId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), focus: z.string().trim().min(2).max(300), inputKind: z.enum(["text", "voice", "code", "canvas"]), evidence: z.string().trim().min(8).max(8000) });

export async function POST(request: Request) {
  try { return Response.json(await createConceptXRay(await authenticate(request), schema.parse(await request.json()))); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to inspect reasoning" }, { status: 400 }); }
}
