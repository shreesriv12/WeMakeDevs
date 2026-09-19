import { debugLog } from "./debug";

export async function transcribeWithDeepgram(audio: ArrayBuffer, contentType: string) {
  const key = process.env.DEEPGRAM_API_KEY; if (!key) throw new Error("DEEPGRAM_API_KEY is not configured");
  const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", { method: "POST", headers: { Authorization: `Token ${key}`, "content-type": contentType }, body: audio });
  if (!response.ok) throw new Error("Deepgram transcription failed");
  const body = await response.json() as { results?: { channels?: { alternatives?: { transcript?: string }[] }[] } };
  return body.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
}

export async function speakWithElevenLabs(text: string) {
  const key = process.env.ELEVENLABS_API_KEY; const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voiceId) throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID must be configured");
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, { method: "POST", headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" }, body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }) });
  if (!response.ok) throw new Error("ElevenLabs speech generation failed");
  return response.arrayBuffer();
}

export async function generateWithOpenRouter(prompt: string) {
  const key = process.env.OPENROUTER_API_KEY; if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
  debugLog("openrouter", "generation request", { model: process.env.OPENROUTER_INTERVIEW_MODEL ?? "meta-llama/llama-3.3-70b-instruct", promptLength: prompt.length });
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ model: process.env.OPENROUTER_INTERVIEW_MODEL ?? "meta-llama/llama-3.3-70b-instruct", messages: [{ role: "user", content: prompt }], temperature: 0.2 }) });
  if (!response.ok) throw new Error("OpenRouter generation failed");
  const body = await response.json() as { choices?: { message?: { content?: string } }[] };
  return body.choices?.[0]?.message?.content ?? "";
}
