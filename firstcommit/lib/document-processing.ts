import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const CHUNK_SIZE = 3200;
const CHUNK_OVERLAP = 400;
const MAX_CHUNKS = 200;

export type ProcessedDocument = { text: string; chunks: string[] };

function collapseRepeatedTokens(value: string) {
  return value
    .replace(/\b(\p{L}{1,12})(?:\s+\1){2,}\b/giu, "$1")
    .replace(/\b([A-Z]{1,5})(?:\s+\1){2,}\b/g, "$1");
}

function collapseRepeatedPhrases(value: string) {
  return value.replace(/\b(.{8,90}?)\s+(?:\1\s+){2,}/giu, "$1 ");
}

function repairSpacedUppercaseWords(value: string) {
  return value
    .replace(/\b([A-Z])(?:\s+([A-Z])){2,}\b/g, (match) => match.replace(/\s+/g, ""))
    .replace(/\b([A-Z]{2,})(?:\s+([A-Z]{1,4})){2,}\b/g, (match) => match.replace(/\s+/g, ""));
}

export function normalizeDocumentText(value: string) {
  return collapseRepeatedPhrases(
    collapseRepeatedTokens(
      repairSpacedUppercaseWords(
        value
          .replace(/\r\n?/g, "\n")
          .replace(/\u00ad/g, "")
          .replace(/[ \t]+/g, " ")
          .replace(/\n /g, "\n")
          .replace(/\n{3,}/g, "\n\n")
      )
    )
  )
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])(?=[A-Za-z])/g, "$1 ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
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
