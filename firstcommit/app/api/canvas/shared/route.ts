import { authenticate } from "@/lib/auth";
import { loadSharedCanvas, saveSharedCanvas } from "@/lib/shared-canvas";
import { z } from "zod";

const query = z.object({ classId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), workspaceKey: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/) });
const body = query.extend({ state: z.array(z.unknown()).max(2000) });

export async function GET(request: Request) {
  try { const params = query.parse(Object.fromEntries(new URL(request.url).searchParams)); return Response.json(await loadSharedCanvas(await authenticate(request), params.classId, params.workspaceKey)); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to load canvas" }, { status: 400 }); }
}
export async function PUT(request: Request) {
  try { return Response.json(await saveSharedCanvas(await authenticate(request), body.parse(await request.json()))); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to save canvas" }, { status: 400 }); }
}
