import { retrieveCourseChunks } from "@/lib/course-repository";
import { authenticate } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ query: z.string().min(3).max(2000), classId: z.literal("cn-b") });

// The classId is currently fixed to the demo user's class. Cognito claims and the
// authorization service will supply this server-side in the next persistence milestone.
export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json()); const actor = await authenticate(request);
    if (!actor.classIds.includes(input.classId) && actor.role !== "admin") throw new Error("Not authorized for this class");
    const chunks = retrieveCourseChunks({ institutionId: actor.institutionId, classId: input.classId, query: input.query });
    return Response.json({ chunks: chunks.map(({ id, title, text, sourceUrl }) => ({ id, title, excerpt: text, sourceUrl })) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
