import { generateWithOpenRouter } from "./voice-providers";
import type { KnowledgeSource } from "./knowledge-retriever";

export type TutorResponse = { text: string; provider: "local" | "openrouter"; fallbackReason?: string };

function localReply() {
  return "Aapke quiz history ke hisaab se Transport Layer reliability aur TCP flow control par focus karein. Pehle 10 minutes mein reliable delivery ka idea samjhein: sequence numbers missing packets detect karte hain, acknowledgements receiver ki confirmation dete hain, aur retransmission lost packet ko dobara bhejta hai. Agle 15 minutes mein sliding window ka diagram banaiye. Aakhir ke 5 minutes mein in concepts par adaptive practice test shuru kijiye.";
}

export async function generateTutorResponse(query: string, language: string, sources: KnowledgeSource[]): Promise<TutorResponse> {
  if (!process.env.OPENROUTER_API_KEY) return { text: localReply(), provider: "local" };
  const context = sources.map((source, index) => `[${index + 1}] ${source.title}\n${source.text}`).join("\n\n");
  try {
    const text = await generateWithOpenRouter([`You are a helpful classroom tutor. Respond in ${language}. Cite course chunks using markers such as [1]. Do not claim facts absent from the supplied context.`, `Course context:\n${context || "No approved course material was retrieved."}`, `Student request:\n${query}`].join("\n\n"));
    if (!text) throw new Error("OpenRouter returned no tutor response");
    return { text, provider: "openrouter" };
  } catch {
    return { text: localReply(), provider: "local", fallbackReason: "OpenRouter tutor unavailable" };
  }
}
