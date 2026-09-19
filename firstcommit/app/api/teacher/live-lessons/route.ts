import { authenticate } from "@/lib/auth";
import { createLiveLesson, listLiveLessons } from "@/lib/live-lessons";
import { z } from "zod";

const createSchema = z.object({ classId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), title: z.string().trim().min(3).max(160), scheduledFor: z.string().datetime(), durationMinutes: z.number().int().min(5).max(240), agenda: z.array(z.string().trim().min(2).max(300)).min(1).max(12) });
const listSchema = z.object({ classId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/) });

export async function GET(request: Request) { try { const params=listSchema.parse(Object.fromEntries(new URL(request.url).searchParams)); return Response.json({ lessons: await listLiveLessons(await authenticate(request), params.classId) }); } catch (error) { return Response.json({ error:error instanceof Error ? error.message : "Unable to load lessons" }, { status:400 }); } }
export async function POST(request: Request) { try { return Response.json(await createLiveLesson(await authenticate(request), createSchema.parse(await request.json())), { status:201 }); } catch (error) { return Response.json({ error:error instanceof Error ? error.message : "Unable to schedule lesson" }, { status:400 }); } }
