import { authenticate } from "@/lib/auth";
import { liveAttendance } from "@/lib/live-classroom";
import { z } from "zod";

const schema = z.object({ classId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), roomKey: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/) });
export async function GET(request: Request) { try { const input=schema.parse(Object.fromEntries(new URL(request.url).searchParams)); return Response.json({ attendance: await liveAttendance(await authenticate(request), input.classId, input.roomKey) }); } catch (error) { return Response.json({ error:error instanceof Error ? error.message : "Unable to load attendance" }, { status:400 }); } }
