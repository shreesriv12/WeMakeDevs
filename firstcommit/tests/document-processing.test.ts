import { describe, expect, it } from "vitest";
import { chunkDocumentText, normalizeDocumentText, processCourseDocument } from "../lib/document-processing";

describe("document processing", () => {
  it("normalizes and overlaps chunks without losing the end of the document", () => {
    const text = "A".repeat(100) + ". " + "B".repeat(100);
    const chunks = chunkDocumentText(text, 120, 20);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain("A");
    expect(chunks.at(-1)).toContain("B");
    expect(normalizeDocumentText("a\r\n\r\n\r\n b")).toBe("a\n\nb");
  });

  it("processes a text document", async () => {
    await expect(processCourseDocument({ bytes: new TextEncoder().encode("Course notes about routing."), contentType: "text/plain" })).resolves.toEqual({ text: "Course notes about routing.", chunks: ["Course notes about routing."] });
  });
});
