import { z } from "zod";
import { authenticate } from "@/lib/auth";
import { discoverOfficialResources } from "@/lib/official-resource-discovery";

const schema = z.object({ topic: z.string().trim().min(2).max(180), purpose: z.enum(["curriculum", "prerequisites", "safety", "practice"]).default("curriculum") });
export async function POST(request: Request) {
  try { await authenticate(request); const { topic, purpose } = schema.parse(await request.json()); const results = await discoverOfficialResources(topic, purpose); return Response.json({ topic, purpose, provider: results.length ? "serpapi-official" : "unavailable", results, notice: "External sources are supplementary; uploaded course notes remain the primary learning evidence." }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to find official resources" }, { status: 400 }); }
}
