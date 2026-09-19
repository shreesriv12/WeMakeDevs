import { orchestrate } from "@/lib/orchestrator";
import { authenticate } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ query: z.string().trim().min(3).max(2000) });

export async function POST(request: Request) {
  try { const input = schema.parse(await request.json()); const actor = await authenticate(request); return Response.json(await orchestrate(input.query, actor)); }
  catch (error) { const message = error instanceof Error ? error.message : "Invalid request"; return Response.json({ error: message }, { status: message === "Authentication required" ? 401 : 400 }); }
}
