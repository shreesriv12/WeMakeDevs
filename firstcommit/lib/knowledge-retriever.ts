import {
  retrieveCourseChunks,
  type CourseChunk
} from "./course-repository";

import {
  qdrantConfigured,
  retrieveQdrantKnowledge
} from "./qdrant";

import {
  debugError,
  debugLog
} from "./debug";

export type KnowledgeSource = {
  id: string;
  title: string;
  text: string;
  sourceUrl: string;
  score?: number;
};

export type KnowledgeRequest = {
  institutionId: string;
  classId: string;
  query: string;
  limit?: number;
};

function localFallback(
  input: KnowledgeRequest
): KnowledgeSource[] {
  return retrieveCourseChunks(
    input
  ).map(
    (
      chunk:
        CourseChunk
    ) => ({
      id:
        chunk.id,

      title:
        chunk.title,

      text:
        chunk.text,

      sourceUrl:
        chunk.sourceUrl
    })
  );
}

export async function retrieveKnowledge(
  input: KnowledgeRequest
): Promise<{
  provider:
    | "local"
    | "qdrant";

  sources:
    KnowledgeSource[];
}> {
  /*
   * Only use the development repository
   * when Qdrant genuinely isn't configured.
   */
  if (
    !qdrantConfigured()
  ) {
    debugLog(
      "knowledge",
      "Qdrant not configured; using local repository",
      {
        institutionId:
          input.institutionId,

        classId:
          input.classId,

        queryLength:
          input.query.length
      }
    );

    return {
      provider:
        "local",

      sources:
        localFallback(
          input
        )
    };
  }

  debugLog(
    "knowledge",
    "starting Qdrant retrieval",
    {
      institutionId:
        input.institutionId,

      classId:
        input.classId,

      queryLength:
        input.query.length,

      limit:
        input.limit ??
        3
    }
  );

  try {
    const sources =
      await retrieveQdrantKnowledge(
        input
      );

    debugLog(
      "knowledge",
      "Qdrant retrieval succeeded",
      {
        institutionId:
          input.institutionId,

        classId:
          input.classId,

        sourceCount:
          sources.length
      }
    );

    return {
      provider:
        "qdrant",

      sources
    };
  } catch (error) {
    /*
     * Do not silently fall back to
     * unrelated demo Computer Networks
     * notes when production retrieval
     * is configured but broken.
     */
    debugError(
      "knowledge",
      "Qdrant retrieval failed",
      error,
      {
        institutionId:
          input.institutionId,

        classId:
          input.classId
      }
    );

    throw error;
  }
}