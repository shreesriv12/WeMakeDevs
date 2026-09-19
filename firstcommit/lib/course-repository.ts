export type CourseChunk = {
  id: string;
  institutionId: string;
  classId: string;
  title: string;
  text: string;
  sourceUrl: string;
};

// Development-only repository. Replace this with a tenant-scoped S3 ingestion + vector index adapter.
const chunks: CourseChunk[] = [
  {
    id: "cn-transport-01", institutionId: "demo-institute", classId: "cn-b",
    title: "Computer Networks - Transport Layer notes",
    text: "The transport layer provides process-to-process delivery. TCP uses sequence numbers, acknowledgements, retransmission and a sliding window for reliable delivery and flow control.",
    sourceUrl: "https://example.edu/courses/cn/transport-layer"
  },
  {
    id: "cn-network-01", institutionId: "demo-institute", classId: "cn-b",
    title: "Computer Networks - Network Layer notes",
    text: "The network layer provides logical addressing and routing. Routers forward packets using a routing table and IP addresses.",
    sourceUrl: "https://example.edu/courses/cn/network-layer"
  }
];

function score(text: string, query: string) {
  const queryTerms = new Set(query.toLowerCase().match(/[a-z]{3,}/g) ?? []);
  const documentTerms = new Set(text.toLowerCase().match(/[a-z]{3,}/g) ?? []);
  return [...queryTerms].filter((term) => documentTerms.has(term)).length;
}

export function retrieveCourseChunks(input: { institutionId: string; classId: string; query: string; limit?: number }) {
  const limit = input.limit ?? 3;
  return chunks
    .filter((chunk) => chunk.institutionId === input.institutionId && chunk.classId === input.classId)
    .map((chunk) => ({ chunk, score: score(`${chunk.title} ${chunk.text}`, input.query) }))
    .sort((a, b) => b.score - a.score)
    .filter((result) => result.score > 0)
    .slice(0, limit)
    .map((result) => result.chunk);
}
