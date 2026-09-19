import type {
  KnowledgeRequest,
  KnowledgeSource
} from "./knowledge-retriever";

import {
  debugError,
  debugLog
} from "./debug";

const DEFAULT_EMBEDDING_MODEL =
  "openai/text-embedding-3-small";

const DEFAULT_COLLECTION =
  "shikshamesh-course-chunks";

const QDRANT_TIMEOUT_MS = 15_000;
const OPENROUTER_TIMEOUT_MS = 30_000;

type QdrantPayload = {
  chunkId: string;
  institutionId: string;
  classId: string;
  documentId?: string;
  title: string;
  text: string;
  sourceUrl: string;
};

type QdrantPoint = {
  id: string;
  vector: number[];
  payload: QdrantPayload;
};

type QdrantQueryPoint = {
  id: string | number;
  score?: number;
  payload?: QdrantPayload;
};

type QdrantCollectionResponse = {
  result?: unknown;
  status?: string;
  time?: number;
};

type QdrantCollectionInfoResponse = {
  result?: {
    payload_schema?: Record<
      string,
      unknown
    >;
  };
  status?: string;
  time?: number;
};

type QdrantPointsResponse = {
  result?: {
    operation_id?: number;
    status?: string;
  };
  status?: string;
  time?: number;
};

type QdrantQueryResponse = {
  result?: {
    points?: QdrantQueryPoint[];
  };
  status?: string;
  time?: number;
};

class QdrantRequestError extends Error {
  status: number;
  responseBody?: string;

  constructor(
    status: number,
    message: string,
    responseBody?: string
  ) {
    super(message);

    this.name =
      "QdrantRequestError";

    this.status =
      status;

    this.responseBody =
      responseBody;
  }
}

function configuration() {
  const rawUrl =
    process.env.QDRANT_URL?.trim();

  const apiKey =
    process.env.QDRANT_API_KEY?.trim();

  const collection =
    process.env.QDRANT_COLLECTION?.trim() ||
    DEFAULT_COLLECTION;

  if (!rawUrl) {
    throw new Error(
      "QDRANT_URL must be configured"
    );
  }

  if (!apiKey) {
    throw new Error(
      "QDRANT_API_KEY must be configured"
    );
  }

  const url =
    rawUrl.replace(/\/+$/, "");

  let parsedUrl: URL;

  try {
    parsedUrl =
      new URL(url);
  } catch {
    throw new Error(
      "QDRANT_URL must be a complete URL"
    );
  }

  if (
    parsedUrl.protocol !== "http:" &&
    parsedUrl.protocol !== "https:"
  ) {
    throw new Error(
      "QDRANT_URL must use http:// or https://"
    );
  }

  return {
    url,
    apiKey,
    collection
  };
}

function getFetchErrorMessage(
  error: unknown
) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const possibleCause = (
    error as Error & {
      cause?: unknown;
    }
  ).cause;

  if (
    possibleCause instanceof Error
  ) {
    return `${error.message}: ${possibleCause.message}`;
  }

  if (possibleCause) {
    return `${error.message}: ${String(
      possibleCause
    )}`;
  }

  return error.message;
}

async function qdrantRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const {
    url,
    apiKey
  } = configuration();

  const requestUrl =
    `${url}${path}`;

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      QDRANT_TIMEOUT_MS
    );

  debugLog(
    "qdrant",
    "request",
    {
      method:
        init.method ?? "GET",

      path,

      origin:
        new URL(url).origin
    }
  );

  let response: Response;

  try {
    response =
      await fetch(
        requestUrl,
        {
          ...init,

          signal:
            controller.signal,

          headers: {
            "api-key":
              apiKey,

            "content-type":
              "application/json",

            accept:
              "application/json",

            ...init.headers
          }
        }
      );
  } catch (error) {
    const message =
      getFetchErrorMessage(
        error
      );

    debugError(
      "qdrant",
      "network request failed",
      error,
      {
        method:
          init.method ?? "GET",

        path,

        origin:
          new URL(url).origin
      }
    );

    throw new Error(
      `Unable to connect to Qdrant at ${
        new URL(url).origin
      }. ${message}`
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const responseBody =
      await response
        .text()
        .catch(() => "");

    debugLog(
      "qdrant",
      "request failed",
      {
        method:
          init.method ?? "GET",

        path,

        status:
          response.status,

        statusText:
          response.statusText,

        responseBody:
          responseBody.slice(
            0,
            1000
          )
      }
    );

    const message =
      `Qdrant request failed ` +
      `(${response.status} ${response.statusText})` +
      (
        responseBody
          ? `: ${responseBody.slice(
              0,
              1000
            )}`
          : ""
      );

    throw new QdrantRequestError(
      response.status,
      message,
      responseBody
    );
  }

  if (
    response.status === 204
  ) {
    return undefined as T;
  }

  const text =
    await response.text();

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(
      text
    ) as T;
  } catch {
    throw new Error(
      `Qdrant returned invalid JSON for ${path}`
    );
  }
}

async function embed(
  text: string
): Promise<number[]> {
  const apiKey =
    process.env
      .OPENROUTER_API_KEY
      ?.trim();

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is required for Qdrant embeddings"
    );
  }

  const model =
    process.env
      .OPENROUTER_EMBEDDING_MODEL
      ?.trim() ||
    DEFAULT_EMBEDDING_MODEL;

  const normalizedText =
    text.trim();

  if (!normalizedText) {
    throw new Error(
      "Cannot generate embedding for empty text"
    );
  }

  debugLog(
    "openrouter",
    "embedding request",
    {
      model,
      textLength:
        normalizedText.length
    }
  );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      OPENROUTER_TIMEOUT_MS
    );

  let response: Response;

  try {
    response =
      await fetch(
        "https://openrouter.ai/api/v1/embeddings",
        {
          method: "POST",

          signal:
            controller.signal,

          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            "content-type":
              "application/json",

            accept:
              "application/json"
          },

          body:
            JSON.stringify({
              model,
              input:
                normalizedText
            })
        }
      );
  } catch (error) {
    debugError(
      "openrouter",
      "embedding network request failed",
      error
    );

    throw new Error(
      `Unable to connect to OpenRouter: ${
        getFetchErrorMessage(
          error
        )
      }`
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorBody =
      await response
        .text()
        .catch(() => "");

    debugLog(
      "openrouter",
      "embedding request failed",
      {
        status:
          response.status,

        statusText:
          response.statusText,

        responseBody:
          errorBody.slice(
            0,
            1000
          )
      }
    );

    throw new Error(
      `OpenRouter embedding failed ` +
      `(${response.status} ${response.statusText})` +
      (
        errorBody
          ? `: ${errorBody.slice(
              0,
              1000
            )}`
          : ""
      )
    );
  }

  const body =
    (await response.json()) as {
      data?: Array<{
        embedding?: number[];
      }>;
    };

  const vector =
    body.data?.[0]?.embedding;

  if (
    !Array.isArray(vector) ||
    vector.length === 0
  ) {
    throw new Error(
      "OpenRouter returned no embedding vector"
    );
  }

  return vector;
}

async function ensureCollection(
  vectorSize: number
) {
  const {
    collection
  } = configuration();

  const collectionPath =
    `/collections/${encodeURIComponent(
      collection
    )}`;

  try {
    await qdrantRequest<QdrantCollectionResponse>(
      collectionPath
    );

    debugLog(
      "qdrant",
      "collection exists",
      {
        collection,
        vectorSize
      }
    );

    return;
  } catch (error) {
    if (
      error instanceof QdrantRequestError &&
      error.status === 404
    ) {
      debugLog(
        "qdrant",
        "collection does not exist; creating",
        {
          collection,
          vectorSize
        }
      );
    } else {
      throw error;
    }
  }

  await qdrantRequest<QdrantCollectionResponse>(
    collectionPath,
    {
      method: "PUT",

      body:
        JSON.stringify({
          vectors: {
            size:
              vectorSize,

            distance:
              "Cosine"
          }
        })
    }
  );

  debugLog(
    "qdrant",
    "collection created",
    {
      collection,
      vectorSize
    }
  );
}

async function getCollectionInfo() {
  const {
    collection
  } = configuration();

  return qdrantRequest<QdrantCollectionInfoResponse>(
    `/collections/${encodeURIComponent(
      collection
    )}`
  );
}

/**
 * Qdrant Cloud strict mode requires
 * indexed payload fields when they
 * are used inside filters.
 *
 * We filter on:
 * - institutionId
 * - classId
 * - documentId
 *
 * All three are exact-match strings,
 * so keyword indexes are appropriate.
 */
async function ensurePayloadIndexes() {
  const {
    collection
  } = configuration();

  const encodedCollection =
    encodeURIComponent(
      collection
    );

  let info =
    await getCollectionInfo();

  let payloadSchema =
    info.result?.payload_schema ??
    {};

  const requiredIndexes = [
    "institutionId",
    "classId",
    "documentId"
  ] as const;

  for (
    const fieldName
    of requiredIndexes
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        payloadSchema,
        fieldName
      )
    ) {
      debugLog(
        "qdrant",
        "payload index exists",
        {
          collection,
          fieldName
        }
      );

      continue;
    }

    debugLog(
      "qdrant",
      "creating payload index",
      {
        collection,
        fieldName,
        fieldSchema:
          "keyword"
      }
    );

    try {
      await qdrantRequest(
        `/collections/${encodedCollection}/index?wait=true`,
        {
          method: "PUT",

          body:
            JSON.stringify({
              field_name:
                fieldName,

              field_schema:
                "keyword"
            })
        }
      );

      debugLog(
        "qdrant",
        "payload index created",
        {
          collection,
          fieldName
        }
      );

      /*
       * Update local copy so this
       * request does not check again.
       */
      payloadSchema = {
        ...payloadSchema,
        [fieldName]:
          "keyword"
      };
    } catch (error) {
      /*
       * A second request may have created
       * the index after our collection GET
       * but before our PUT.
       *
       * Refresh collection info. If the
       * index exists now, treat this as a
       * successful concurrent creation.
       */
      info =
        await getCollectionInfo();

      payloadSchema =
        info.result
          ?.payload_schema ??
        {};

      if (
        Object.prototype.hasOwnProperty.call(
          payloadSchema,
          fieldName
        )
      ) {
        debugLog(
          "qdrant",
          "payload index already exists after refresh",
          {
            collection,
            fieldName
          }
        );

        continue;
      }

      throw error;
    }
  }
}

export function qdrantConfigured() {
  return Boolean(
    process.env
      .QDRANT_URL
      ?.trim() &&
    process.env
      .QDRANT_API_KEY
      ?.trim() &&
    process.env
      .OPENROUTER_API_KEY
      ?.trim()
  );
}

export async function indexCourseChunks(
  input: {
    institutionId: string;
    classId: string;
    documentId: string;
    title: string;
    sourceUrl: string;
    chunks: string[];
  }
) {
  if (
    !qdrantConfigured()
  ) {
    debugLog(
      "qdrant",
      "Qdrant not configured; skipping indexing"
    );

    return {
      provider:
        "local" as const,

      status:
        "not-configured" as const,

      indexed: 0
    };
  }

  const chunks =
    input.chunks
      .map(
        (chunk) =>
          chunk.trim()
      )
      .filter(Boolean);

  if (
    chunks.length === 0
  ) {
    throw new Error(
      "No non-empty document chunks were produced for indexing"
    );
  }

  debugLog(
    "qdrant",
    "indexing course chunks",
    {
      documentId:
        input.documentId,

      institutionId:
        input.institutionId,

      classId:
        input.classId,

      chunkCount:
        chunks.length
    }
  );

  /*
   * Generate one vector first so
   * we know the required collection
   * vector size.
   */
  const firstVector =
    await embed(
      chunks[0]
    );

  await ensureCollection(
    firstVector.length
  );

  /*
   * Create tenant/document indexes
   * before writing/searching points.
   */
  await ensurePayloadIndexes();

  const points:
    QdrantPoint[] = [];

  for (
    let index = 0;
    index < chunks.length;
    index += 1
  ) {
    const text =
      chunks[index];

    const vector =
      index === 0
        ? firstVector
        : await embed(
            text
          );

    if (
      vector.length !==
      firstVector.length
    ) {
      throw new Error(
        `Embedding dimension mismatch. Expected ${
          firstVector.length
        }, received ${
          vector.length
        }`
      );
    }

    points.push({
      id:
        crypto.randomUUID(),

      vector,

      payload: {
        chunkId:
          `${input.documentId}:${
            index + 1
          }`,

        institutionId:
          input.institutionId,

        classId:
          input.classId,

        documentId:
          input.documentId,

        title:
          input.title,

        text,

        sourceUrl:
          input.sourceUrl
      }
    });
  }

  const {
    collection
  } = configuration();

  await qdrantRequest<QdrantPointsResponse>(
    `/collections/${encodeURIComponent(
      collection
    )}/points?wait=true`,
    {
      method: "PUT",

      body:
        JSON.stringify({
          points
        })
    }
  );

  debugLog(
    "qdrant",
    "course chunks indexed",
    {
      documentId:
        input.documentId,

      indexed:
        points.length
    }
  );

  return {
    provider:
      "qdrant" as const,

    status:
      "indexed" as const,

    indexed:
      points.length
  };
}

export async function retrieveQdrantKnowledge(
  input:
    KnowledgeRequest & {
      documentId?: string;
    }
): Promise<
  KnowledgeSource[]
> {
  if (
    !qdrantConfigured()
  ) {
    throw new Error(
      "Qdrant retrieval requested but Qdrant is not configured"
    );
  }

  debugLog(
    "qdrant",
    "retrieving knowledge",
    {
      institutionId:
        input.institutionId,

      classId:
        input.classId,

      documentId:
        input.documentId ??
        null,

      limit:
        input.limit ?? 3,

      queryLength:
        input.query.length
    }
  );

  /*
   * Ensure strict-mode filter indexes
   * exist. This also fixes an existing
   * collection without requiring a PDF
   * re-upload.
   */
  await ensurePayloadIndexes();

  /*
   * Query embeddings MUST use the
   * same model used during indexing.
   */
  const queryVector =
    await embed(
      input.query
    );

  const {
    collection
  } = configuration();

  const must: Array<{
    key: string;
    match: {
      value: string;
    };
  }> = [
    {
      key:
        "institutionId",

      match: {
        value:
          input.institutionId
      }
    },

    {
      key:
        "classId",

      match: {
        value:
          input.classId
      }
    }
  ];

  if (
    input.documentId
  ) {
    must.push({
      key:
        "documentId",

      match: {
        value:
          input.documentId
      }
    });
  }

  /*
   * Qdrant universal Query API:
   *
   * POST
   * /collections/{collection}/points/query
   *
   * Dense vector is supplied in `query`.
   */
  const body =
    await qdrantRequest<QdrantQueryResponse>(
      `/collections/${encodeURIComponent(
        collection
      )}/points/query`,
      {
        method: "POST",

        body:
          JSON.stringify({
            query:
              queryVector,

            filter: {
              must
            },

            limit:
              input.limit ??
              3,

            with_payload:
              true,

            with_vector:
              false
          })
      }
    );

  const points =
    body.result?.points ??
    [];

  debugLog(
    "qdrant",
    "raw query response received",
    {
      pointCount:
        points.length,

      institutionId:
        input.institutionId,

      classId:
        input.classId
    }
  );

  const sources:
    KnowledgeSource[] =
    points.flatMap(
      (
        result
      ): KnowledgeSource[] => {
        const payload =
          result.payload;

        if (
          !payload ||
          !payload.chunkId ||
          !payload.title ||
          !payload.text ||
          !payload.sourceUrl
        ) {
          debugLog(
            "qdrant",
            "ignoring point with incomplete payload",
            {
              pointId:
                String(
                  result.id
                )
            }
          );

          return [];
        }

        return [
          {
            id:
              payload.chunkId,

            title:
              payload.title,

            text:
              payload.text,

            sourceUrl:
              payload.sourceUrl,

            score:
              result.score
          }
        ];
      }
    );

  debugLog(
    "qdrant",
    "knowledge retrieved",
    {
      resultCount:
        sources.length,

      titles:
        sources.map(
          (source) =>
            source.title
        )
    }
  );

  return sources;
}