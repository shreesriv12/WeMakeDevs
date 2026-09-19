import { authenticate } from "@/lib/auth";
import { findYouTubePlaylists } from "@/lib/youtube-playlists";
import { z } from "zod";
const schema=z.object({topic:z.string().trim().min(2).max(180)});
export async function GET(request:Request){try{await authenticate(request);const topic=schema.parse({topic:new URL(request.url).searchParams.get("topic")}).topic;const playlists=await findYouTubePlaylists(topic);return Response.json({topic,provider:playlists.length?"serpapi-youtube":"unavailable",playlists});}catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to find playlists"},{status:400});}}
