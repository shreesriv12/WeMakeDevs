import { retrieveCourseChunks, type CourseChunk } from "./course-repository";
import { qdrantConfigured, retrieveQdrantKnowledge } from "./qdrant";

export type KnowledgeSource = { id: string; title: string; text: string; sourceUrl: string; score?: number };
export type KnowledgeRequest = { institutionId: string; classId: string; query: string; limit?: number };

function localFallback(input: KnowledgeRequest): KnowledgeSource[] {
  return retrieveCourseChunks(input).map((chunk: CourseChunk) => ({ id: chunk.id, title: chunk.title, text: chunk.text, sourceUrl: chunk.sourceUrl }));
}

export async function retrieveKnowledge(input: KnowledgeRequest): Promise<{ provider: "local" | "qdrant"; sources: KnowledgeSource[] }> {
  if (!qdrantConfigured()) return { provider: "local", sources: localFallback(input) };
  try {
    return { provider: "qdrant", sources: await retrieveQdrantKnowledge(input) };
  } catch {
    return { provider: "local", sources: localFallback(input) };
  }
}
