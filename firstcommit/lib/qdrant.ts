import type { KnowledgeRequest, KnowledgeSource } from "./knowledge-retriever";
import { debugError, debugLog } from "./debug";

const defaultEmbeddingModel = "openai/text-embedding-3-small";

type QdrantPoint = {
  id: string;
  vector: number[];
  payload: {
    chunkId: string;
    institutionId: string;
    classId: string;
    documentId?: string;
    title: string;
    text: string;
    sourceUrl: string;
  };
};

type QdrantSearchResult = { id: string; score?: number; payload?: QdrantPoint["payload"] };

function configuration() {
  const url = process.env.QDRANT_URL?.replace(/\/$/, "");
  const apiKey = process.env.QDRANT_API_KEY;
  const collection = process.env.QDRANT_COLLECTION ?? "shikshamesh-course-chunks";
  if (!url || !apiKey) throw new Error("QDRANT_URL and QDRANT_API_KEY must be configured");
  let parsedUrl: URL;
  try { parsedUrl = new URL(url); } catch { throw new Error("QDRANT_URL must be a full URL, for example https://your-cluster.cloud.qdrant.io"); }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") throw new Error("QDRANT_URL must use http:// or https://");
  return { url, apiKey, collection };
}

async function qdrantRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, apiKey } = configuration();
  debugLog("qdrant", "request", { method: init.method ?? "GET", path });
  const response = await fetch(`${url}${path}`, { ...init, headers: { "api-key": apiKey, "content-type": "application/json", ...init.headers } });
  if (!response.ok) {
    debugLog("qdrant", "request failed", { path, status: response.status });
    throw new Error(`Qdrant request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function embed(text: string) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is required for Qdrant embeddings");
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENROUTER_EMBEDDING_MODEL ?? defaultEmbeddingModel, input: text })
  });
  debugLog("openrouter", "embedding request", { model: process.env.OPENROUTER_EMBEDDING_MODEL ?? defaultEmbeddingModel, textLength: text.length });
  if (!response.ok) throw new Error(`OpenRouter embedding failed (${response.status})`);
  const body = await response.json() as { data?: { embedding?: number[] }[] };
  const vector = body.data?.[0]?.embedding;
  if (!vector?.length) throw new Error("OpenRouter returned no embedding");
  return vector;
}

async function ensureCollection(vectorSize: number) {
  const { collection } = configuration();
  try {
    await qdrantRequest(`/collections/${encodeURIComponent(collection)}`);
    return;
  } catch {
    await qdrantRequest(`/collections/${encodeURIComponent(collection)}`, { method: "PUT", body: JSON.stringify({ vectors: { size: vectorSize, distance: "Cosine" } }) });
  }
}

export function qdrantConfigured() {
  return Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY && process.env.OPENROUTER_API_KEY);
}

export async function indexCourseChunks(input: { institutionId: string; classId: string; documentId: string; title: string; sourceUrl: string; chunks: string[] }) {
  if (!qdrantConfigured()) return { provider: "local" as const, status: "not-configured" as const, indexed: 0 };
  debugLog("qdrant", "indexing course chunks", { documentId: input.documentId, chunkCount: input.chunks.length });
  const firstVector = await embed(input.chunks[0] ?? input.title);
  await ensureCollection(firstVector.length);
  const points: QdrantPoint[] = [];
  for (const [index, text] of input.chunks.entries()) {
    points.push({ id: crypto.randomUUID(), vector: index === 0 ? firstVector : await embed(text), payload: { chunkId: `${input.documentId}:${index + 1}`, institutionId: input.institutionId, classId: input.classId, documentId: input.documentId, title: input.title, text, sourceUrl: input.sourceUrl } });
  }
  const { collection } = configuration();
  await qdrantRequest(`/collections/${encodeURIComponent(collection)}/points?wait=true`, { method: "PUT", body: JSON.stringify({ points }) });
  debugLog("qdrant", "course chunks indexed", { documentId: input.documentId, indexed: points.length });
  return { provider: "qdrant" as const, status: "indexed" as const, indexed: points.length };
}

export async function retrieveQdrantKnowledge(input: KnowledgeRequest & { documentId?: string }): Promise<KnowledgeSource[]> {
  debugLog("qdrant", "retrieving knowledge", { institutionId: input.institutionId, classId: input.classId, limit: input.limit ?? 3 });
  const queryVector = await embed(input.query);
  const { collection } = configuration();
  const must = [{ key: "institutionId", match: { value: input.institutionId } }, { key: "classId", match: { value: input.classId } }];
  if (input.documentId) must.push({ key: "documentId", match: { value: input.documentId } });
  const body = await qdrantRequest<{ result?: QdrantSearchResult[] }>(`/collections/${encodeURIComponent(collection)}/points/search`, { method: "POST", body: JSON.stringify({ vector: queryVector, limit: input.limit ?? 3, with_payload: true, filter: { must } }) });
  const sources = (body.result ?? []).flatMap((result) => {
    const payload = result.payload;
    if (!payload?.text) return [];
    return [{ id: payload.chunkId, title: payload.title, text: payload.text, sourceUrl: payload.sourceUrl, score: result.score }];
  });
  debugLog("qdrant", "knowledge retrieved", { resultCount: sources.length });
  return sources;
}
