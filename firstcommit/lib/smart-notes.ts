import { z } from "zod";
import type { Actor } from "./auth";
import { retrieveKnowledge, type KnowledgeSource } from "./knowledge-retriever";
import { generateWithOpenRouter } from "./voice-providers";

const schema = z.object({ title:z.string().min(2).max(140), summary:z.string().min(10).max(900), sections:z.array(z.object({ heading:z.string().min(2).max(140), explanation:z.string().min(10).max(1400), bullets:z.array(z.string().min(2).max(240)).min(1).max(6) })).min(2).max(6), commonMistakes:z.array(z.string().min(4).max(400)).min(1).max(5), flashcards:z.array(z.object({ front:z.string().min(2).max(300), back:z.string().min(2).max(500) })).min(2).max(8), memoryHook:z.string().min(4).max(400) });
export type SmartNotes = z.infer<typeof schema>;

function fallback(topic: string, sources: KnowledgeSource[]): SmartNotes {
  const source= sources[0]; const sentences=(source?.text??"").replace(/\s+/g," ").split(/[.!?]/).map((item)=>item.trim()).filter((item)=>item.length>20);
  const key=sentences.slice(0,6); const first=key[0]??`Review the authorized notes for ${topic}.`;
  return { title:`${topic} — revision notes`, summary:first, sections:[{heading:"Core idea",explanation:first,bullets:key.slice(1,4).length?key.slice(1,4):["Identify the definition in your notes.","Connect it to the worked example."]},{heading:"Exam approach",explanation:"Explain the concept in your own words, then apply it to one concrete problem.",bullets:["State the key definition.","Show the relationship between concepts.","Check the common edge case."]}], commonMistakes:["Memorising a term without explaining how it connects to the next step.","Using an example that is not supported by the uploaded notes."], flashcards:[{front:`What is the core idea of ${topic}?`,back:first},{front:"How should you revise this topic?",back:"Explain it in your own words and solve one note-grounded example."}], memoryHook:`${topic}: define it, connect it, apply it.`, };
}

export async function createSmartNotes(actor: Actor, input: { classId:string; topic:string; language:"English"|"Hindi"|"Hinglish"; style:"exam"|"visual"|"beginner"|"interview"; length:"quick"|"detailed" }) {
  if (!actor.classIds.includes(input.classId) && actor.role!=="admin") throw new Error("Not authorized for this class");
  const retrieval=await retrieveKnowledge({institutionId:actor.institutionId,classId:input.classId,query:input.topic,limit:3}); if(!retrieval.sources.length)throw new Error("No authorized course notes were found for this topic");
  const fallbackNotes=fallback(input.topic,retrieval.sources); if(!process.env.OPENROUTER_API_KEY)return {notes:fallbackNotes,provider:"deterministic" as const,sources:retrieval.sources};
  try { const context=retrieval.sources.map((source,index)=>`[${index+1}] ${source.title}\n${source.text}`).join("\n\n").slice(0,12000); const raw=await generateWithOpenRouter(`Create beautiful, accurate study notes using ONLY the authorized notes. Return JSON only with this exact shape: {title,summary,sections:[{heading,explanation,bullets}],commonMistakes,flashcards:[{front,back}],memoryHook}. Topic: ${input.topic}. Language: ${input.language}. Style: ${input.style}. Length: ${input.length}. Include no facts absent from the notes and no markdown. Authorized notes:\n${context}`); const notes=schema.parse(JSON.parse(raw.replace(/^```json\s*|\s*```$/g,"").trim())); return {notes,provider:"openrouter" as const,sources:retrieval.sources}; } catch { return {notes:fallbackNotes,provider:"deterministic" as const,sources:retrieval.sources}; }
}
