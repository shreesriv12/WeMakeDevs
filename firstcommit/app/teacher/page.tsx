"use client";

import { FormEvent, useState } from "react";
import {
  SignInPanel,
  useAuthSession
} from "@/components/auth-session";

type Workflow = {
  provider: string;
  executionId: string;
  input: {
    scheduledFor: string;
    languages: string[];
  };
};

type WorkflowStatus = {
  status: string;
  startedAt: string;
  stoppedAt?: string;
};

type Analytics = {
  concepts: {
    concept: string;
    learnersAttempted: number;
    strugglingLearners: number;
    struggleRate: number;
    action: string;
  }[];
  privacy: string;
};

type Upload = {
  uploaded: {
    bucket: string;
    key: string;
    documentId: string;
    chunkCount: number;
  };

  ingestion: {
    provider: string;
    status: string;
    ingestionJobId?: string;
  };
};

type IngestionStatus = {
  provider: string;
  status: string;
  startedAt?: string;
  updatedAt?: string;

  statistics?: {
    numberOfDocumentsScanned?: number;
    numberOfNewDocumentsIndexed?: number;
    numberOfModifiedDocumentsIndexed?: number;
    numberOfDocumentsFailed?: number;
  };
};

type CourseDocument = {
  id: string;
  sourceName: string;
  ingestionStatus: string;
};

export default function TeacherPage() {
  const {
    apiFetch,
    idToken,
    role,
    loading: authLoading
  } = useAuthSession();

  const [scheduledFor, setScheduledFor] = useState(
    new Date(Date.now() + 86400000)
      .toISOString()
      .slice(0, 16)
  );

  const [languages, setLanguages] = useState([
    "hi",
    "mr"
  ]);

  const [result, setResult] =
    useState<Workflow | null>(null);

  const [workflowStatus, setWorkflowStatus] =
    useState<WorkflowStatus | null>(null);

  const [analytics, setAnalytics] =
    useState<Analytics | null>(null);

  const [upload, setUpload] =
    useState<Upload | null>(null);

  const [lectureSourceId, setLectureSourceId] =
    useState("");

  const [ingestionStatus, setIngestionStatus] =
    useState<IngestionStatus | null>(null);

  const [documents, setDocuments] =
    useState<CourseDocument[]>([]);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      if (!lectureSourceId) {
        throw new Error(
          "Upload course material first, then use its document ID for this grounded quiz."
        );
      }

      const response = await apiFetch(
        "/api/teacher/quiz-workflows",
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            classId: "cn-b",
            lectureSourceId,
            languages,
            scheduledFor: new Date(
              scheduledFor
            ).toISOString(),
            difficulty: "easy",
            useOpenRouter: true
          })
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          body.error ??
            "Could not start workflow"
        );
      }

      setResult(body);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not start workflow"
      );
    } finally {
      setLoading(false);
    }
  }

  async function uploadCourseFile(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    // Save the form before any await.
    // event.currentTarget may not remain available
    // after asynchronous operations.
    const formElement =
      event.currentTarget;

    setLoading(true);
    setError("");
    setUpload(null);
    setIngestionStatus(null);

    try {
      const form =
        new FormData(formElement);

      form.set(
        "classId",
        "cn-b"
      );

      const response =
        await apiFetch(
          "/api/courses/upload",
          {
            method: "POST",
            body: form
          }
        );

      const raw =
        await response.text();

      let body: any;

      try {
        body =
          JSON.parse(raw);
      } catch {
        body = {
          error:
            raw.slice(0, 300) ||
            `Upload failed (${response.status})`
        };
      }

      if (!response.ok) {
        throw new Error(
          body.error ??
            "Could not upload course material"
        );
      }

      setUpload(body);

      setLectureSourceId(
        body.uploaded.documentId
      );

      await loadDocuments();

      // Safe reset using saved reference.
      formElement.reset();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not upload course material"
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshIngestionStatus() {
    const jobId =
      upload?.ingestion.ingestionJobId;

    if (!jobId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await apiFetch(
          `/api/courses/ingestion/${jobId}?documentId=${encodeURIComponent(
            upload.uploaded.documentId
          )}`
        );

      const body =
        await response.json();

      if (!response.ok) {
        throw new Error(
          body.error ??
            "Could not fetch ingestion status"
        );
      }

      setIngestionStatus(body);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not fetch ingestion status"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDocuments() {
    setLoading(true);
    setError("");

    try {
      const response =
        await apiFetch(
          "/api/courses?classId=cn-b"
        );

      const body =
        await response.json();

      if (!response.ok) {
        throw new Error(
          body.error ??
            "Could not load course documents"
        );
      }

      setDocuments(
        body.documents ?? []
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load course documents"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalytics() {
    setLoading(true);
    setError("");

    try {
      const response =
        await apiFetch(
          "/api/teacher/analytics",
          {
            method: "POST",
            headers: {
              "content-type":
                "application/json"
            },
            body: JSON.stringify({
              classId: "cn-b",
              threshold: 0.4
            })
          }
        );

      const body =
        await response.json();

      if (!response.ok) {
        throw new Error(
          body.error ??
            "Could not load analytics"
        );
      }

      setAnalytics(body);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load analytics"
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshWorkflowStatus() {
    if (!result) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await apiFetch(
          `/api/teacher/quiz-workflows/${encodeURIComponent(
            result.executionId
          )}`
        );

      const body =
        await response.json();

      if (!response.ok) {
        throw new Error(
          body.error ??
            "Could not fetch workflow status"
        );
      }

      setWorkflowStatus(body);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not fetch workflow status"
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------
  // AUTH CHECK
  // ---------------------------------------

  if (authLoading) {
    return (
      <main>
        <p>
          Checking sign-in session…
        </p>
      </main>
    );
  }

  // User is not signed in.
  if (!idToken) {
    return (
      <main>
        <section className="hero">
          <span className="eyebrow">
            TEACHER WORKFLOW
          </span>

          <h1>
            Teacher access requires
            sign-in.
          </h1>

          <p>
            Sign in using a teacher or
            administrator account.
          </p>

          <a href="/">
            Student experience
          </a>
        </section>

        <SignInPanel />
      </main>
    );
  }

  // Signed-in students must not see
  // the teacher interface.
  if (
    role !== "teacher" &&
    role !== "admin"
  ) {
    return (
      <main>
        <section className="hero">
          <span className="eyebrow">
            ACCESS DENIED
          </span>

          <h1>
            Teacher access required.
          </h1>

          <p>
            Your current role is{" "}
            <b>{role}</b>.
          </p>

          <p>
            This workspace is available
            only to teachers and
            administrators.
          </p>

          <a href="/">
            Return to student dashboard
          </a>
        </section>

        <SignInPanel />
      </main>
    );
  }

  // ---------------------------------------
  // TEACHER / ADMIN UI
  // ---------------------------------------

  return (
    <main className="teacher-dashboard">
      <section className="hero">
        <span className="eyebrow">
          TEACHER WORKFLOW
        </span>

        <h1>
          Plan once. Orchestrate the rest.
        </h1>

        <p>
          Upload approved course material,
          then create and schedule a
          multilingual quiz.
        </p>

        <p>
          Signed in as{" "}
          <b>{role}</b>.
        </p>

        <a href="/">
          Student experience
        </a>
      </section>

      {/* ----------------------------------
          COURSE UPLOAD
      ----------------------------------- */}

      <form
        className="composer teacher-form"
        onSubmit={
          uploadCourseFile
        }
      >
        <span className="eyebrow">
          COURSE KNOWLEDGE BASE
        </span>

        <h2>
          Upload course material
        </h2>

        <p>
          PDF, DOCX, or TXT; maximum
          10 MB. It is stored in S3 and
          indexed in the tenant-scoped
          Qdrant collection.
        </p>

        <label htmlFor="course-file">
          Course file for class cn-b
        </label>

        <input
          id="course-file"
          name="file"
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
        />

        <button
          disabled={loading}
        >
          {loading
            ? "Uploading…"
            : "Upload and ingest"}
        </button>
      </form>

      {/* ----------------------------------
          UPLOAD RESULT
      ----------------------------------- */}

      {upload && (
        <section className="result">
          <span className="eyebrow">
            UPLOAD ACCEPTED
          </span>

          <h2>
            Course material indexed
          </h2>

          <p>
            Provider:{" "}
            <b>
              {
                upload.ingestion
                  .provider
              }
            </b>
            {" · "}
            Status:{" "}
            <b>
              {ingestionStatus?.status ??
                upload.ingestion.status}
            </b>
          </p>

          <p>
            Document ID for this
            grounded quiz:{" "}
            <code>
              {
                upload.uploaded
                  .documentId
              }
            </code>
          </p>

          <small>
            {upload.uploaded.key}
          </small>

          {upload.ingestion
            .ingestionJobId && (
            <button
              type="button"
              onClick={
                refreshIngestionStatus
              }
              disabled={loading}
            >
              {loading
                ? "Checking…"
                : "Refresh ingestion status"}
            </button>
          )}

          {ingestionStatus?.statistics && (
            <p>
              <small>
                Scanned:{" "}
                {ingestionStatus
                  .statistics
                  .numberOfDocumentsScanned ??
                  0}
                {" · "}
                Indexed:{" "}
                {(ingestionStatus
                  .statistics
                  .numberOfNewDocumentsIndexed ??
                  0) +
                  (ingestionStatus
                    .statistics
                    .numberOfModifiedDocumentsIndexed ??
                    0)}
                {" · "}
                Failed:{" "}
                {ingestionStatus
                  .statistics
                  .numberOfDocumentsFailed ??
                  0}
              </small>
            </p>
          )}
        </section>
      )}

      {/* ----------------------------------
          QUIZ WORKFLOW
      ----------------------------------- */}

      <form
        className="composer teacher-form"
        onSubmit={submit}
      >
        <span className="eyebrow">
          QUIZ WORKFLOW
        </span>

        <h2>
          Create grounded quiz
        </h2>

        <label htmlFor="lecture-source">
          Source document
        </label>

        <select
          id="lecture-source"
          value={lectureSourceId}
          onChange={(event) =>
            setLectureSourceId(
              event.target.value
            )
          }
          required
        >
          <option value="">
            Select an uploaded document
          </option>

          {documents.map(
            (document) => (
              <option
                key={document.id}
                value={document.id}
              >
                {document.sourceName}
                {" — "}
                {
                  document.ingestionStatus
                }
              </option>
            )
          )}
        </select>

        <button
          type="button"
          onClick={loadDocuments}
          disabled={loading}
        >
          {loading
            ? "Loading…"
            : "Load uploaded documents"}
        </button>

        <p className="notice">
          Quiz generation and translation
          use OpenRouter with the selected
          course material as context.
        </p>

        <label htmlFor="schedule">
          Schedule quiz
        </label>

        <input
          id="schedule"
          type="datetime-local"
          value={scheduledFor}
          onChange={(event) =>
            setScheduledFor(
              event.target.value
            )
          }
          required
        />

        <p>
          Translations
        </p>

        {[
          "hi",
          "mr"
        ].map(
          (language) => (
            <label
              className="option"
              key={language}
            >
              <input
                type="checkbox"
                checked={languages.includes(
                  language
                )}
                onChange={(event) =>
                  setLanguages(
                    (current) =>
                      event.target
                        .checked
                        ? [
                            ...new Set([
                              ...current,
                              language
                            ])
                          ]
                        : current.filter(
                            (
                              item
                            ) =>
                              item !==
                              language
                          )
                  )
                }
              />

              {language === "hi"
                ? "Hindi"
                : "Marathi"}
            </label>
          )
        )}

        <button
          disabled={
            loading ||
            languages.length ===
              0
          }
        >
          {loading
            ? "Starting workflow…"
            : "Create and schedule quiz"}
        </button>
      </form>

      {/* ----------------------------------
          ERROR
      ----------------------------------- */}

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      {/* ----------------------------------
          WORKFLOW RESULT
      ----------------------------------- */}

      {result && (
        <section className="result">
          <span className="eyebrow">
            WORKFLOW STARTED
          </span>

          <h2>
            Quiz automation is running
          </h2>

          <p>
            Provider:{" "}
            <b>
              {result.provider}
            </b>
          </p>

          <p>
            Execution:{" "}
            <code>
              {
                result.executionId
              }
            </code>
          </p>

          {workflowStatus && (
            <p>
              Status:{" "}
              <b>
                {
                  workflowStatus.status
                }
              </b>
            </p>
          )}

          <button
            type="button"
            onClick={
              refreshWorkflowStatus
            }
            disabled={loading}
          >
            {loading
              ? "Checking…"
              : "Refresh workflow status"}
          </button>

          <button
            type="button"
            onClick={
              loadAnalytics
            }
            disabled={loading}
          >
            {loading
              ? "Loading…"
              : "Show class insights"}
          </button>
        </section>
      )}

      {/* ----------------------------------
          ANALYTICS
      ----------------------------------- */}

      {analytics && (
        <section className="result analytics">
          <span className="eyebrow">
            AGGREGATED ANALYTICS
          </span>

          <h2>
            Concepts needing intervention
          </h2>

          {analytics.concepts.map(
            (concept) => (
              <article
                key={
                  concept.concept
                }
              >
                <b>
                  {concept.concept}
                </b>

                <p>
                  {Math.round(
                    concept.struggleRate *
                      100
                  )}
                  % struggling (
                  {
                    concept.strugglingLearners
                  }
                  /
                  {
                    concept.learnersAttempted
                  }
                  )
                </p>

                <small>
                  {concept.action}
                </small>
              </article>
            )
          )}

          <p>
            <small>
              {analytics.privacy}
            </small>
          </p>
        </section>
      )}
    </main>
  );
}
