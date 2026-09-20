import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { uploadProcessedCourseDocument, type CourseUpload } from "./aws/s3-course-store";

export async function storeCourseDocument(input: CourseUpload & { chunks: string[] }) {
  if (process.env.COURSE_STORAGE_PROVIDER !== "local") {
    const uploaded = await uploadProcessedCourseDocument(input);
    return { ...uploaded, provider: "s3" as const, sourceUrl: `s3://${uploaded.bucket}/${uploaded.sourceKey}` };
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Local course storage is only supported in development");
  }
  for (const scope of [input.institutionId, input.classId]) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(scope)) throw new Error("Invalid storage scope");
  }
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  if (!safeName || safeName === "." || safeName === "..") throw new Error("Invalid file name");
  const documentId = crypto.randomUUID();
  const sourceKey = `${input.institutionId}/${input.classId}/${documentId}/${safeName}`;
  const directory = path.join(process.cwd(), ".local-course-storage", input.institutionId, input.classId, documentId);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, safeName), input.bytes);
  return { provider: "local" as const, bucket: "local", sourceKey, documentId, kbSourceKey: "", sourceUrl: `local://courses/${sourceKey}` };
}
