import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { requiredAwsConfig } from "@/lib/aws/config";

export type CourseUpload = { institutionId: string; classId: string; fileName: string; contentType: string; bytes: Uint8Array };

function cleanSegment(value: string) {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(value)) throw new Error("Invalid storage scope");
  return value;
}

export async function uploadCourseObject(input: CourseUpload) {
  const { region, bucket } = requiredAwsConfig();
  const institutionId = cleanSegment(input.institutionId); const classId = cleanSegment(input.classId);
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  if (!safeName) throw new Error("Invalid file name");
  const key = `institutions/${institutionId}/classes/${classId}/uploads/${crypto.randomUUID()}-${safeName}`;
  const client = new S3Client({ region });
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: input.bytes, ContentType: input.contentType, ServerSideEncryption: "aws:kms", Metadata: { institutionId, classId } }));
  return { bucket, key };
}

export async function uploadProcessedCourseDocument(input: CourseUpload & { chunks: string[] }) {
  const { region, bucket } = requiredAwsConfig();
  const institutionId = cleanSegment(input.institutionId); const classId = cleanSegment(input.classId);
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const documentId = crypto.randomUUID();
  const client = new S3Client({ region });
  const sourceKey = `raw/institutions/${institutionId}/classes/${classId}/${documentId}-${safeName}`;
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: sourceKey, Body: input.bytes, ContentType: input.contentType, ServerSideEncryption: "aws:kms", Metadata: { institutionId, classId } }));
  const keys: string[] = [];
  for (const [index, chunk] of input.chunks.entries()) {
    const key = `institutions/${institutionId}/classes/${classId}/processed/${documentId}/chunk-${String(index + 1).padStart(3, "0")}.txt`;
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: chunk, ContentType: "text/plain; charset=utf-8", ServerSideEncryption: "aws:kms" }));
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: `${key}.metadata.json`, Body: JSON.stringify({ metadataAttributes: { institutionId, classId, documentId, chunkIndex: index + 1 } }), ContentType: "application/json", ServerSideEncryption: "aws:kms" }));
    keys.push(key);
  }
  return { bucket, sourceKey, keys, documentId };
}
