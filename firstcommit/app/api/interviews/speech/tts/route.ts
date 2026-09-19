import { authenticate } from "@/lib/auth";
import { speakWithElevenLabs } from "@/lib/voice-providers";
import { z } from "zod";
const schema = z.object({ text: z.string().min(1).max(1200) });
export async function POST(request: Request) { try { await authenticate(request); const audio = await speakWithElevenLabs(schema.parse(await request.json()).text); return new Response(audio, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } }); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Speech generation failed" }, { status: 400 }); } }
