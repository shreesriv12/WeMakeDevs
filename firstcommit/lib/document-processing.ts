import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const CHUNK_SIZE = 3200;
const CHUNK_OVERLAP = 400;
const MAX_CHUNKS = 200;

export type ProcessedDocument = { text: string; chunks: string[] };

export function normalizeDocumentText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n /g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function chunkDocumentText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const normalized = normalizeDocumentText(text);
  if (!normalized) throw new Error("No readable text was found in this document");
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(start + size, normalized.length);
    if (end < normalized.length) {
      const boundary = Math.max(normalized.lastIndexOf("\n", end), normalized.lastIndexOf(". ", end));
      if (boundary > start + size / 2) end = boundary + 1;
    }
    chunks.push(normalized.slice(start, end).trim());
    if (chunks.length > MAX_CHUNKS) throw new Error("Document produces too many chunks; split it into smaller files");
    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks.filter(Boolean);
}

export async function processCourseDocument(input: { bytes: Uint8Array; contentType: string }): Promise<ProcessedDocument> {
  let rawText: string;
  if (input.contentType === "text/plain") rawText = new TextDecoder().decode(input.bytes);
  else if (input.contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    rawText = (await mammoth.extractRawText({ buffer: Buffer.from(input.bytes) })).value;
  } else if (input.contentType === "application/pdf") {
    const parser = new PDFParse({ data: new Uint8Array(input.bytes) });
    try { rawText = (await parser.getText()).text; }
    finally { await parser.destroy(); }
  } else throw new Error("Only TXT, PDF and DOCX are accepted");
  const text = normalizeDocumentText(rawText);
  return { text, chunks: chunkDocumentText(text) };
}
