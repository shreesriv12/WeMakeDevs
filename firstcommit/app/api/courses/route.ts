import { authenticate } from "@/lib/auth";
import { listCourseDocuments } from "@/lib/course-document-store";
import { z } from "zod";

const schema = z.object({ classId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/) });

export async function GET(request: Request) {
  try {
    const actor = await authenticate(request);
    const input = schema.parse(Object.fromEntries(new URL(request.url).searchParams));
    return Response.json({ documents: await listCourseDocuments(actor, input.classId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list course documents";
    return Response.json({ error: message }, { status: message.includes("authorized") ? 403 : 400 });
  }
}
