import { authenticate } from "@/lib/auth";
import { getKnowledgeIngestionStatus } from "@/lib/aws/knowledge-ingestion";
import { updateCourseDocumentIngestion } from "@/lib/course-document-store";

const validJobId = /^[A-Za-z0-9]{1,100}$/;

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const actor = await authenticate(request);
    if (actor.role !== "teacher" && actor.role !== "admin") throw new Error("Not authorized to view ingestion status");
    const { jobId } = await params;
    if (!validJobId.test(jobId)) throw new Error("Invalid ingestion job ID");
    const status = await getKnowledgeIngestionStatus(jobId);
    const documentId = new URL(request.url).searchParams.get("documentId");
    if (documentId) await updateCourseDocumentIngestion(actor, documentId, jobId, status.status);
    return Response.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not fetch ingestion status";
    return Response.json({ error: message }, { status: message.includes("authorized") ? 403 : 400 });
  }
}
