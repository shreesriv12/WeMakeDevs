import {
  uploadProcessedCourseDocument
} from "@/lib/aws/s3-course-store";

import {
  authenticate
} from "@/lib/auth";

import {
  recordCourseDocument
} from "@/lib/course-document-store";

import {
  indexCourseChunks
} from "@/lib/qdrant";

import {
  debugError,
  debugLog
} from "@/lib/debug";

const MAX_BYTES =
  10 * 1024 * 1024;

const ACCEPTED =
  new Set([
    "text/plain",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]);

export async function POST(
  request: Request
) {
  try {
    debugLog(
      "upload",
      "upload request received"
    );

    const form =
      await request.formData();

    const file =
      form.get("file");

    const classId =
      form.get("classId");

    const actor =
      await authenticate(
        request
      );

    if (
      !(file instanceof File)
    ) {
      return Response.json(
        {
          error:
            "A file is required"
        },
        {
          status: 400
        }
      );
    }

    if (
      typeof classId !==
        "string" ||
      !classId.trim()
    ) {
      return Response.json(
        {
          error:
            "classId is required"
        },
        {
          status: 400
        }
      );
    }

    if (
      actor.role !==
        "admin" &&
      (
        actor.role !==
          "teacher" ||
        !actor.classIds.includes(
          classId
        )
      )
    ) {
      return Response.json(
        {
          error:
            "Not authorized to upload course content for this class"
        },
        {
          status: 403
        }
      );
    }

    if (
      file.size === 0 ||
      file.size >
        MAX_BYTES
    ) {
      return Response.json(
        {
          error:
            "File must be between 1 byte and 10 MB"
        },
        {
          status: 400
        }
      );
    }

    if (
      !ACCEPTED.has(
        file.type
      )
    ) {
      return Response.json(
        {
          error:
            "Only TXT, PDF and DOCX files are accepted"
        },
        {
          status: 400
        }
      );
    }

    debugLog(
      "upload",
      "file validated",
      {
        name:
          file.name,

        contentType:
          file.type,

        bytes:
          file.size,

        classId
      }
    );

    const bytes =
      new Uint8Array(
        await file.arrayBuffer()
      );

    const {
      processCourseDocument
    } = await import(
      "@/lib/document-processing"
    );

    const processed =
      await processCourseDocument(
        {
          bytes,
          contentType:
            file.type
        }
      );

    if (
      !processed.chunks
        .length
    ) {
      throw new Error(
        "The uploaded document produced no text chunks"
      );
    }

    debugLog(
      "upload",
      "document processed",
      {
        name:
          file.name,
        chunkCount:
          processed.chunks
            .length
      }
    );

    const uploaded =
      await uploadProcessedCourseDocument(
        {
          institutionId:
            actor.institutionId,

          classId,

          fileName:
            file.name,

          contentType:
            file.type,

          bytes,

          chunks:
            processed.chunks
        }
      );

    debugLog(
      "upload",
      "document stored",
      {
        documentId:
          uploaded.documentId,

        bucket:
          uploaded.bucket,

        sourceKey:
          uploaded.sourceKey
      }
    );

    const ingestion =
      await indexCourseChunks(
        {
          institutionId:
            actor.institutionId,

          classId,

          documentId:
            uploaded.documentId,

          title:
            file.name,

          sourceUrl:
            `s3://${uploaded.bucket}/${uploaded.sourceKey}`,

          chunks:
            processed.chunks
        }
      );

    const persistence =
      await recordCourseDocument(
        actor,
        {
          id:
            uploaded.documentId,

          classId,

          sourceKey:
            uploaded.sourceKey,

          sourceName:
            file.name,

          contentType:
            file.type,

          ingestionStatus:
            ingestion.status
        }
      );

    debugLog(
      "upload",
      "upload completed",
      {
        documentId:
          uploaded.documentId,

        provider:
          ingestion.provider,

        indexed:
          ingestion.indexed
      }
    );

    return Response.json(
      {
        uploaded: {
          bucket:
            uploaded.bucket,

          key:
            uploaded.sourceKey,

          documentId:
            uploaded.documentId,

          chunkCount:
            processed.chunks
              .length
        },

        ingestion,

        persistence
      },
      {
        status: 202
      }
    );
  } catch (error) {
    debugError(
      "upload",
      "upload failed",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Upload failed";

    return Response.json(
      {
        error:
          message
      },
      {
        status: 500
      }
    );
  }
}