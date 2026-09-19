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

type QdrantPoint = {
  id: string;
  vector: number[];
  payload: {
    chunkId: string;
    institutionId: string;
    classId: string;
    documentId?: string;
    title: string;
    text: string;
    sourceUrl: string;
  };
};

type QdrantSearchResult = {
  id: string;
  score?: number;
  payload?: QdrantPoint["payload"];
};

type QdrantCollectionResponse = {
  result?: unknown;
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

class QdrantRequestError extends Error {
  status: number;
  responseBody?: string;

  constructor(
    status: number,
    message: string,
    responseBody?: string
  ) {
    super(message);

    this.name = "QdrantRequestError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

function configuration() {
  const rawUrl = process.env.QDRANT_URL?.trim();

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

  const url = rawUrl.replace(/\/+$/, "");

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(
      "QDRANT_URL must be a complete URL, for example http://127.0.0.1:6333"
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
    possibleCause &&
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

  const requestUrl = `${url}${path}`;

  const controller =
    new AbortController();

  const timeout = setTimeout(
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
    response = await fetch(
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
      getFetchErrorMessage(error);

    debugError(
      "qdrant",
      "network request failed",
      error,
      {
        method:
          init.method ??
          "GET",
        path,
        origin:
          new URL(url)
            .origin
      }
    );

    throw new Error(
      `Unable to connect to Qdrant at ${new URL(
        url
      ).origin}. ${message}`
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body =
      await response
        .text()
        .catch(
          () => ""
        );

    debugLog(
      "qdrant",
      "request failed",
      {
        method:
          init.method ??
          "GET",
        path,
        status:
          response.status,
        statusText:
          response.statusText
      }
    );

    throw new QdrantRequestError(
      response.status,
      `Qdrant request failed (${response.status} ${response.statusText})`,
      body
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
    process.env.OPENROUTER_API_KEY?.trim();

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

  debugLog(
    "openrouter",
    "embedding request",
    {
      model,
      textLength:
        text.length
    }
  );

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    30_000
  );

  let response: Response;

  try {
    response = await fetch(
      "https://openrouter.ai/api/v1/embeddings",
      {
        method:
          "POST",

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
          JSON.stringify(
            {
              model,
              input:
                text
            }
          )
      }
    );
  } catch (error) {
    debugError(
      "openrouter",
      "embedding network request failed",
      error
    );

    throw new Error(
      `Unable to connect to OpenRouter: ${getFetchErrorMessage(
        error
      )}`
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorBody =
      await response
        .text()
        .catch(
          () => ""
        );

    debugLog(
      "openrouter",
      "embedding request failed",
      {
        status:
          response.status,
        statusText:
          response.statusText
      }
    );

    throw new Error(
      `OpenRouter embedding failed (${response.status} ${response.statusText})${
        errorBody
          ? `: ${errorBody}`
          : ""
      }`
    );
  }

  const body =
    (await response.json()) as {
      data?: Array<{
        embedding?: number[];
      }>;
    };

  const vector =
    body.data?.[0]
      ?.embedding;

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
      error instanceof
        QdrantRequestError &&
      error.status ===
        404
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
      /*
       * IMPORTANT:
       * Connection failures,
       * authentication errors,
       * 500 responses, TLS
       * failures, etc. must not
       * be interpreted as
       * "collection missing".
       */
      throw error;
    }
  }

  await qdrantRequest<QdrantCollectionResponse>(
    collectionPath,
    {
      method:
        "PUT",

      body:
        JSON.stringify(
          {
            vectors: {
              size:
                vectorSize,
              distance:
                "Cosine"
            }
          }
        )
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

export function qdrantConfigured() {
  return Boolean(
    process.env
      .QDRANT_URL &&
      process.env
        .QDRANT_API_KEY &&
      process.env
        .OPENROUTER_API_KEY
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
      chunkCount:
        chunks.length
    }
  );

  /*
   * Generate the first
   * embedding before creating
   * the collection so that we
   * know the vector dimension.
   */
  const firstVector =
    await embed(
      chunks[0]
    );

  await ensureCollection(
    firstVector.length
  );

  const points: QdrantPoint[] =
    [];

  for (
    let index = 0;
    index <
    chunks.length;
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
        `Embedding dimension mismatch. Expected ${firstVector.length}, received ${vector.length}`
      );
    }

    points.push(
      {
        id:
          crypto.randomUUID(),

        vector,

        payload: {
          chunkId:
            `${input.documentId}:${index + 1}`,

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
      }
    );
  }

  const {
    collection
  } = configuration();

  await qdrantRequest<QdrantPointsResponse>(
    `/collections/${encodeURIComponent(
      collection
    )}/points?wait=true`,
    {
      method:
        "PUT",

      body:
        JSON.stringify(
          {
            points
          }
        )
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
    return [];
  }

  debugLog(
    "qdrant",
    "retrieving knowledge",
    {
      institutionId:
        input.institutionId,
      classId:
        input.classId,
      limit:
        input.limit ?? 3
    }
  );

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
    must.push(
      {
        key:
          "documentId",
        match: {
          value:
            input.documentId
        }
      }
    );
  }

  const body =
    await qdrantRequest<{
      result?: QdrantSearchResult[];
    }>(
      `/collections/${encodeURIComponent(
        collection
      )}/points/search`,
      {
        method:
          "POST",

        body:
          JSON.stringify(
            {
              vector:
                queryVector,

              limit:
                input.limit ??
                3,

              with_payload:
                true,

              filter: {
                must
              }
            }
          )
      }
    );

  const sources =
    (
      body.result ??
      []
    ).flatMap(
      (
        result
      ): KnowledgeSource[] => {
        const payload =
          result.payload;

        if (
          !payload?.text
        ) {
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
        sources.length
    }
  );

  return sources;
}