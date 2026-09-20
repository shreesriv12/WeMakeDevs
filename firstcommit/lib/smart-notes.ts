import { z } from "zod";
import type { Actor } from "./auth";
import { retrieveKnowledge, type KnowledgeSource } from "./knowledge-retriever";
import { generateWithOpenRouter } from "./voice-providers";
import { normalizeDocumentText } from "./document-processing";

const schema = z.object({ title:z.string().min(2).max(140), summary:z.string().min(10).max(900), sections:z.array(z.object({ heading:z.string().min(2).max(140), explanation:z.string().min(10).max(1400), bullets:z.array(z.string().min(2).max(240)).min(1).max(6) })).min(2).max(6), commonMistakes:z.array(z.string().min(4).max(400)).min(1).max(5), flashcards:z.array(z.object({ front:z.string().min(2).max(300), back:z.string().min(2).max(500) })).min(2).max(8), memoryHook:z.string().min(4).max(400) });
export type SmartNotes = z.infer<typeof schema>;

function cleanStudyText(value: string) {
  return normalizeDocumentText(value)
    .replace(/\b(?:answer|click to flip)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function scoreSentence(sentence: string) {
  let score = 0;
  if (sentence.length >= 35 && sentence.length <= 260) score += 3;
  if (/\b(is|are|means|known as|because|causes?|results?|process|reaction|example|observed|called)\b/i.test(sentence)) score += 2;
  if (/\b(oxidation|corrosion|rusting|reaction|metal|iron|oxygen|chemical)\b/i.test(sentence)) score += 2;
  if (/^[A-Z][^A-Z]{8,}/.test(sentence)) score += 1;
  if ((sentence.match(/[A-Z]{3,}/g) ?? []).length > 2) score -= 3;
  if ((sentence.match(/\b\w+\b/g) ?? []).length < 6) score -= 2;
  return score;
}

function extractKeySentences(sources: KnowledgeSource[]) {
  const joined = cleanStudyText(sources.map((source) => source.text).join(" "));
  const raw = joined
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 24 && item.length <= 320);

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const sentence of raw) {
    const key = sentence.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(sentence);
  }
  return deduped.sort((a,b)=>scoreSentence(b)-scoreSentence(a));
}

function fallback(topic: string, sources: KnowledgeSource[]): SmartNotes {
  const key = extractKeySentences(sources).slice(0,8);
  const first = key[0] ?? `Review the authorized notes for ${topic}.`;
  const supporting = key.slice(1,4);

  return {
    title:`${topic} — revision notes`,
    summary:first,
    sections:[
      {
        heading:"Core idea",
        explanation:first,
        bullets:supporting.length ? supporting : ["Identify the definition in your notes.","Connect it to the worked example."]
      },
      {
        heading:"Exam approach",
        explanation:"Explain the concept in your own words, then apply it to one concrete problem.",
        bullets:["State the key definition.","Show the relationship between concepts.","Use one example directly supported by the uploaded notes."]
      }
    ],
    commonMistakes:[
      "Memorising a term without explaining how it connects to the next step.",
      "Using an example that is not supported by the uploaded notes."
    ],
    flashcards:[
      {front:`What is the core idea of ${topic}?`,back:first},
      {front:"Give one note-grounded example.",back:supporting[0] ?? "Use an example stated in the uploaded notes and explain what it demonstrates."}
    ],
    memoryHook:`${topic}: define it, connect it, apply it.`,
  };
}

export async function createSmartNotes(actor: Actor, input: { classId:string; topic:string; language:"English"|"Hindi"|"Hinglish"; style:"exam"|"visual"|"beginner"|"interview"; length:"quick"|"detailed" }) {
  if (!actor.classIds.includes(input.classId) && actor.role!=="admin") throw new Error("Not authorized for this class");
  const retrieval=await retrieveKnowledge({institutionId:actor.institutionId,classId:input.classId,query:input.topic,limit:3}); if(!retrieval.sources.length)throw new Error("No authorized course notes were found for this topic");
  const cleanedSources = retrieval.sources.map((source)=>({ ...source, text: cleanStudyText(source.text) }));
  const fallbackNotes=fallback(input.topic,cleanedSources);
  if(!process.env.OPENROUTER_API_KEY)return {notes:fallbackNotes,provider:"deterministic" as const,sources:cleanedSources};

  try {
    const context=cleanedSources.map((source,index)=>`[${index+1}] ${source.title}\n${source.text}`).join("\n\n").slice(0,12000);
    const raw=await generateWithOpenRouter(`Create accurate, clean study notes using ONLY the authorized notes. Ignore duplicated PDF header/footer text, broken repeated words, and extraction artifacts. Return JSON only with this exact shape: {title,summary,sections:[{heading,explanation,bullets}],commonMistakes,flashcards:[{front,back}],memoryHook}. Topic: ${input.topic}. Language: ${input.language}. Style: ${input.style}. Length: ${input.length}. Include no facts absent from the notes and no markdown. Authorized notes:\n${context}`);
    const notes=schema.parse(JSON.parse(raw.replace(/^\`\`\`json\s*|\s*\`\`\`$/g,"").trim()));
    return {notes,provider:"openrouter" as const,sources:cleanedSources};
  } catch {
    return {notes:fallbackNotes,provider:"deterministic" as const,sources:cleanedSources};
  }
}
