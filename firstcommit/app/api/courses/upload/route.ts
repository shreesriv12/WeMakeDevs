import { uploadProcessedCourseDocument } from "@/lib/aws/s3-course-store";
import { authenticate } from "@/lib/auth";
import { recordCourseDocument } from "@/lib/course-document-store";
import { indexCourseChunks } from "@/lib/qdrant";
import { debugError, debugLog } from "@/lib/debug";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = new Set(["text/plain", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

export async function POST(request: Request) {
  try {
    debugLog("upload", "upload request received");
    const form = await request.formData();
    const file = form.get("file"); const classId = form.get("classId");
    const actor = await authenticate(request);
    if (!(file instanceof File) || typeof classId !== "string") throw new Error("file and classId are required");
    if (actor.role !== "admin" && (actor.role !== "teacher" || !actor.classIds.includes(classId))) throw new Error("Not authorized to upload course content for this class");
    if (file.size === 0 || file.size > MAX_BYTES) throw new Error("File must be between 1 byte and 10 MB");
    if (!ACCEPTED.has(file.type)) throw new Error("Only TXT, PDF and DOCX are accepted");
    const bytes = new Uint8Array(await file.arrayBuffer());
    debugLog("upload", "file validated", { name: file.name, contentType: file.type, bytes: file.size, classId });
    const { processCourseDocument } = await import("@/lib/document-processing");
    const processed = await processCourseDocument({ bytes, contentType: file.type });
    const uploaded = await uploadProcessedCourseDocument({ institutionId: actor.institutionId, classId, fileName: file.name, contentType: file.type, bytes, chunks: processed.chunks });
    const ingestion = await indexCourseChunks({ institutionId: actor.institutionId, classId, documentId: uploaded.documentId, title: file.name, sourceUrl: `s3://${uploaded.bucket}/${uploaded.sourceKey}`, chunks: processed.chunks });
    const persistence = await recordCourseDocument(actor, { id: uploaded.documentId, classId, sourceKey: uploaded.sourceKey, sourceName: file.name, contentType: file.type, ingestionStatus: ingestion.status });
    debugLog("upload", "upload completed", { documentId: uploaded.documentId, provider: ingestion.provider, indexed: ingestion.indexed });
    return Response.json({ uploaded: { bucket: uploaded.bucket, key: uploaded.sourceKey, documentId: uploaded.documentId, chunkCount: uploaded.keys.length }, ingestion, persistence }, { status: 202 });
  } catch (error) {
    debugError("upload", "upload failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
