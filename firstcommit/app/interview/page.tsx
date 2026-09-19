"use client";

import {
  FormEvent,
  useRef,
  useState
} from "react";
import { useSearchParams } from "next/navigation";

import {
  SignInPanel,
  useAuthSession
} from "@/components/auth-session";

type Question = {
  id: string;
  prompt: string;
  sourceTitle: string;
};

type Session = {
  sessionId: string;
  questions: Question[];
  provider: string;
};

type InterviewHistory = {
  sessionId: string;
  focus: string;
  answered: number;
  averageScore: number;
};

type InterviewReport = {
  averageScore: number;
  answered: number;
  totalQuestions: number;
  feedback: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<{ 0?: { transcript?: string }; isFinal?: boolean }> };
type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function speechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  const browserWindow = window as typeof window & { SpeechRecognition?: BrowserSpeechRecognitionConstructor; webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

function preferredRecorderMimeType() {
  if (
    typeof MediaRecorder ===
    "undefined"
  ) {
    return "";
  }

  const supported = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4"
  ];

  return (
    supported.find(
      (type) =>
        MediaRecorder.isTypeSupported(
          type
        )
    ) ?? ""
  );
}

export default function CourseInterviewPage() {
  const params = useSearchParams();
  const {
    apiFetch,
    idToken,
    loading:
      authLoading
  } =
    useAuthSession();

  const recorderRef =
    useRef<MediaRecorder | null>(
      null
    );

  const recorderStreamRef =
    useRef<MediaStream | null>(
      null
    );

  const liveRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const liveRecognitionShouldRestartRef = useRef(false);
  const recordingBaseAnswerRef = useRef<Record<string, string>>({});
  const liveFinalTranscriptRef = useRef<Record<string, string>>({});

  const [
    recordingQuestionId,
    setRecordingQuestionId
  ] =
    useState<
      string | null
    >(null);

  const [transcriptionStatus, setTranscriptionStatus] = useState<Record<string, string>>({});

  const [
    history,
    setHistory
  ] =
    useState<
      InterviewHistory[]
    >([]);

  const [
    focus,
    setFocus
  ] =
    useState(
      params.get("topic") ?? "transport reliability"
    );

  const [
    session,
    setSession
  ] =
    useState<
      Session | null
    >(null);

  const [
    answers,
    setAnswers
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    feedback,
    setFeedback
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    report,
    setReport
  ] =
    useState<
      InterviewReport | null
    >(null);

  const [
    error,
    setError
  ] =
    useState("");

  const [
    busy,
    setBusy
  ] =
    useState(false);

  async function start(
    event:
      FormEvent
  ) {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      const response =
        await apiFetch(
          "/api/interviews/course",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json"
            },

            body:
              JSON.stringify(
                {
                  classId:
                    "cn-b",

                  focus
                }
              )
          }
        );

      const body =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          body.error ??
            "Could not start interview"
        );
      }

      setSession(
        body
      );

      setAnswers(
        {}
      );

      setFeedback(
        {}
      );

      setReport(
        null
      );
    } catch (
      cause
    ) {
      setError(
        cause instanceof
          Error
          ? cause.message
          : "Could not start interview"
      );
    } finally {
      setBusy(
        false
      );
    }
  }

  async function answer(
    questionId:
      string
  ) {
    if (
      !session
    ) {
      return;
    }

    const responseText =
      answers[
        questionId
      ]?.trim();

    if (
      !responseText
    ) {
      setError(
        "Record or type an answer first."
      );

      return;
    }

    setBusy(true);
    setError("");

    try {
      const response =
        await apiFetch(
          `/api/interviews/course/${session.sessionId}/answer`,
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json"
            },

            body:
              JSON.stringify(
                {
                  questionId,

                  answer:
                    responseText
                }
              )
          }
        );

      const body =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          body.error ??
            "Could not score answer"
        );
      }

      setFeedback(
        (
          current
        ) => ({
          ...current,

          [questionId]:
            `${body.score}% — ${body.feedback}`
        })
      );
    } catch (
      cause
    ) {
      setError(
        cause instanceof
          Error
          ? cause.message
          : "Could not score answer"
      );
    } finally {
      setBusy(
        false
      );
    }
  }

  async function loadReport() {
    if (
      !session
    ) {
      return;
    }

    setError("");

    try {
      const response =
        await apiFetch(
          `/api/interviews/course/${session.sessionId}/report`
        );

      const body =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          body.error ??
            "Could not load report"
        );
      }

      setReport(
        body
      );
    } catch (
      cause
    ) {
      setError(
        cause instanceof
          Error
          ? cause.message
          : "Could not load report"
      );
    }
  }

  async function loadHistory() {
    setError("");

    try {
      const response =
        await apiFetch(
          "/api/interviews/course"
        );

      const body =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          body.error ??
            "Could not load interview history"
        );
      }

      setHistory(
        body.interviews ??
          []
      );
    } catch (
      cause
    ) {
      setError(
        cause instanceof
          Error
          ? cause.message
          : "Could not load interview history"
      );
    }
  }

  function browserSpeak(
    text: string
  ) {
    if (
      !(
        "speechSynthesis" in
        window
      )
    ) {
      throw new Error(
        "Text-to-speech is not supported by this browser."
      );
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        text
      );

    utterance.lang =
      "en-IN";

    utterance.rate =
      0.92;

    window.speechSynthesis.speak(
      utterance
    );
  }

  async function speak(
    text: string
  ) {
    setError("");

    try {
      const response =
        await apiFetch(
          "/api/interviews/speech/tts",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json"
            },

            body:
              JSON.stringify(
                {
                  text
                }
              )
          }
        );

      if (
        !response.ok
      ) {
        let message =
          "Server text-to-speech failed";

        try {
          const body =
            await response.json();

          message =
            body.error ??
            message;
        } catch {
          // Ignore invalid JSON.
        }

        throw new Error(
          message
        );
      }

      const blob =
        await response.blob();

      if (
        !blob.size
      ) {
        throw new Error(
          "Server returned empty audio"
        );
      }

      const url =
        URL.createObjectURL(
          blob
        );

      const audio =
        new Audio(url);

      audio.onended =
        () => {
          URL.revokeObjectURL(
            url
          );
        };

      audio.onerror =
        () => {
          URL.revokeObjectURL(
            url
          );

          try {
            browserSpeak(
              text
            );
          } catch (
            cause
          ) {
            setError(
              cause instanceof
                Error
                ? cause.message
                : "Could not play audio"
            );
          }
        };

      await audio.play();
    } catch (
      cause
    ) {
      console.warn(
        "[tts] server TTS unavailable; using browser voice",
        cause
      );

      try {
        browserSpeak(
          text
        );
      } catch (
        fallbackError
      ) {
        setError(
          fallbackError instanceof
            Error
            ? fallbackError.message
            : "Text-to-speech failed"
        );
      }
    }
  }

  function stopLiveTranscription() {
    liveRecognitionShouldRestartRef.current = false;
    const recognition = liveRecognitionRef.current;
    liveRecognitionRef.current = null;
    try { recognition?.stop(); } catch { /* Recognition may already be stopped. */ }
  }

  function startLiveTranscription(questionId: string) {
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setTranscriptionStatus((current) => ({ ...current, [questionId]: "Recording audio. Live captions are not supported in this browser." }));
      return;
    }
    const recognition = new Recognition();
    liveRecognitionRef.current = recognition;
    liveRecognitionShouldRestartRef.current = true;
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = liveFinalTranscriptRef.current[questionId] ?? "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]; const text = result?.[0]?.transcript?.trim() ?? "";
        if (result?.isFinal) finalText = `${finalText} ${text}`.trim(); else interimText = `${interimText} ${text}`.trim();
      }
      liveFinalTranscriptRef.current[questionId] = finalText;
      const base = recordingBaseAnswerRef.current[questionId] ?? "";
      setAnswers((current) => ({ ...current, [questionId]: [base, finalText, interimText].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() }));
      setTranscriptionStatus((current) => ({ ...current, [questionId]: "Live transcript active — Deepgram will verify it after Stop." }));
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") setTranscriptionStatus((current) => ({ ...current, [questionId]: "Live captions paused; audio recording continues." }));
    };
    recognition.onend = () => {
      if (liveRecognitionShouldRestartRef.current && recorderRef.current?.state === "recording") {
        window.setTimeout(() => { try { recognition.start(); } catch { /* Browser may still be stopping. */ } }, 150);
      }
    };
    try { recognition.start(); } catch { setTranscriptionStatus((current) => ({ ...current, [questionId]: "Recording audio. Live captions could not start." })); }
  }

  /*
   * Browser speech recognition is retained
   * only as a fallback for browsers/devices
   * that cannot use MediaRecorder.
   */
  function browserTranscribe(
    questionId:
      string
  ) {
    const Recognition =
      (
        window as Window &
          typeof globalThis & {
            SpeechRecognition?: new () => any;
            webkitSpeechRecognition?: new () => any;
          }
      )
        .SpeechRecognition ??
      (
        window as Window &
          typeof globalThis & {
            SpeechRecognition?: new () => any;
            webkitSpeechRecognition?: new () => any;
          }
      )
        .webkitSpeechRecognition;

    if (
      !Recognition
    ) {
      setError(
        "Speech recording is unavailable in this browser. Open the site on localhost or HTTPS, or type your answer."
      );

      return;
    }

    const recognition =
      new Recognition();

    recognition.lang =
      "en-IN";

    recognition.interimResults =
      false;

    recognition.continuous =
      false;

    recognition.onresult =
      (
        event: any
      ) => {
        const transcript =
          event
            .results?.[0]?.[0]
            ?.transcript
            ?.trim();

        if (
          !transcript
        ) {
          setError(
            "No speech was detected."
          );

          return;
        }

        setAnswers(
          (
            current
          ) => ({
            ...current,

            [questionId]:
              `${
                current[
                  questionId
                ] ?? ""
              } ${transcript}`.trim()
          })
        );
      };

    recognition.onerror =
      (
        event: any
      ) => {
        console.error(
          "[browser-stt]",
          event
        );

        setError(
          "Speech recognition could not understand the response. Please try again or type your answer."
        );
      };

    recognition.start();
  }

  function stopRecorder() {
    const recorder =
      recorderRef.current;

    if (
      !recorder
    ) {
      return;
    }

    if (
      recorder.state !==
      "inactive"
    ) {
      console.log(
        "[recording] stopping"
      );

      recorder.stop();
    }
  }

  async function recordAnswer(
    questionId:
      string
  ) {
    setError("");

    /*
     * Pressing the same button while recording
     * stops the current recording.
     */
    if (
      recorderRef.current
    ) {
      stopRecorder();
      return;
    }

    try {
      if (
        !window.isSecureContext
      ) {
        throw new Error(
          "Microphone access requires localhost or HTTPS. Open the app using http://localhost:3002 instead of the network IP."
        );
      }

      if (
        !navigator
          .mediaDevices
          ?.getUserMedia
      ) {
        console.warn(
          "[recording] MediaDevices unavailable; trying browser speech recognition"
        );

        browserTranscribe(
          questionId
        );

        return;
      }

      if (
        typeof MediaRecorder ===
        "undefined"
      ) {
        console.warn(
          "[recording] MediaRecorder unavailable; trying browser speech recognition"
        );

        browserTranscribe(
          questionId
        );

        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: {
              echoCancellation:
                true,

              noiseSuppression:
                true,

              autoGainControl:
                true
            }
          }
        );

      recorderStreamRef.current =
        stream;

      console.log(
        "[recording] microphone permission granted"
      );

      const mimeType =
        preferredRecorderMimeType();

      const recorder =
        mimeType
          ? new MediaRecorder(
              stream,
              {
                mimeType
              }
            )
          : new MediaRecorder(
              stream
            );

      const chunks:
        Blob[] =
        [];

      recorderRef.current =
        recorder;

      recordingBaseAnswerRef.current[questionId] = answers[questionId]?.trim() ?? "";
      liveFinalTranscriptRef.current[questionId] = "";

      setRecordingQuestionId(
        questionId
      );

      setTranscriptionStatus((current) => ({ ...current, [questionId]: "Starting microphone…" }));

      recorder.onstart =
        () => {
          console.log(
            "[recording] started",
            {
              mimeType:
                recorder.mimeType
            }
          );
          startLiveTranscription(questionId);
        };

      recorder.ondataavailable =
        (
          event:
            BlobEvent
        ) => {
          if (
            event.data.size >
            0
          ) {
            chunks.push(
              event.data
            );

            console.log(
              "[recording] chunk received",
              {
                bytes:
                  event
                    .data
                    .size
              }
            );
          }
        };

      recorder.onerror =
        (
          event:
            Event
        ) => {
          console.error(
            "[recording] MediaRecorder error",
            event
          );

          setError(
            "An error occurred while recording audio."
          );
        };

      recorder.onstop =
        async () => {
          console.log(
            "[recording] stopped"
          );

          stopLiveTranscription();

          recorderRef.current =
            null;

          setRecordingQuestionId(
            null
          );

          setTranscriptionStatus((current) => ({ ...current, [questionId]: "Creating final transcript with Deepgram…" }));

          const activeStream =
            recorderStreamRef.current;

          recorderStreamRef.current =
            null;

          activeStream
            ?.getTracks()
            .forEach(
              (
                track
              ) =>
                track.stop()
            );

          try {
            if (
              chunks.length ===
              0
            ) {
              throw new Error(
                "Recording produced no audio data."
              );
            }

            const finalType =
              recorder.mimeType ||
              mimeType ||
              "audio/webm";

            const audio =
              new Blob(
                chunks,
                {
                  type:
                    finalType
                }
              );

            console.log(
              "[recording] final audio",
              {
                bytes:
                  audio.size,
                type:
                  audio.type
              }
            );

            /*
             * A tiny blob usually means the microphone
             * captured effectively nothing.
             */
            if (
              audio.size <
              500
            ) {
              throw new Error(
                "Recording was too short. Speak for several seconds before stopping."
              );
            }

            const response =
              await apiFetch(
                "/api/interviews/speech/stt",
                {
                  method:
                    "POST",

                  headers: {
                    "content-type":
                      audio.type ||
                      "audio/webm"
                  },

                  body:
                    audio
                }
              );

            let body: {
              transcript?: string;
              error?: string;
            };

            try {
              body =
                await response.json();
            } catch {
              throw new Error(
                `Speech transcription returned an invalid response (${response.status})`
              );
            }

            console.log(
              "[recording] STT response",
              body
            );

            if (
              !response.ok
            ) {
              throw new Error(
                body.error ??
                  `Speech transcription failed (${response.status})`
              );
            }

            const transcript =
              body.transcript?.trim();

            if (
              !transcript
            ) {
              throw new Error(
                "Audio was uploaded successfully, but no speech was detected."
              );
            }

            const baseAnswer = recordingBaseAnswerRef.current[questionId] ?? "";
            setAnswers((current) => ({ ...current, [questionId]: [baseAnswer, transcript].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() }));
            setTranscriptionStatus((current) => ({ ...current, [questionId]: "Transcription ready ✓" }));
          } catch (
            cause
          ) {
            console.error(
              "[recording] transcription failed",
              cause
            );

            setTranscriptionStatus((current) => ({ ...current, [questionId]: "Final transcription failed. Keeping the live transcript." }));

            setError(
              cause instanceof
                Error
                ? cause.message
                : "Recording could not be transcribed."
            );
          }
        };

      /*
       * Timeslice makes the browser emit chunks
       * during longer recordings as well.
       */
      recorder.start(
        1000
      );
    } catch (
      cause
    ) {
      console.error(
        "[recording] microphone initialization failed",
        cause
      );

      stopLiveTranscription();

      recorderRef.current =
        null;

      setRecordingQuestionId(
        null
      );

      recorderStreamRef.current
        ?.getTracks()
        .forEach(
          (
            track
          ) =>
            track.stop()
        );

      recorderStreamRef.current =
        null;

      setError(
        cause instanceof
          Error
          ? cause.message
          : "Could not access the microphone."
      );
    }
  }

  if (
    authLoading
  ) {
    return (
      <main>
        <p>
          Checking sign-in
          session…
        </p>
      </main>
    );
  }

  if (
    !idToken
  ) {
    return (
      <main>
        <section className="hero">
          <span className="eyebrow">
            COURSE INTERVIEW
            AGENT
          </span>

          <h1>
            Practice from your
            own notes.
          </h1>
        </section>

        <SignInPanel />
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <span className="eyebrow">
          COURSE INTERVIEW
          AGENT
        </span>

        <h1>
          Interview practice
          grounded in uploaded
          notes.
        </h1>

        <p>
          The agent retrieves only
          your authorized class
          material, asks note-based
          questions, and gives
          feedback on your answer.
        </p>
      </section>

      <SignInPanel />

      <form
        className="composer"
        onSubmit={start}
      >
        <label htmlFor="interview-focus">
          Topic or concept from
          your notes
        </label>

        <input
          id="interview-focus"
          value={focus}
          onChange={(
            event
          ) =>
            setFocus(
              event.target
                .value
            )
          }
          required
        />

        <button
          disabled={busy}
        >
          {busy
            ? "Preparing…"
            : "Start course interview"}
        </button>

        <button
          type="button"
          onClick={
            loadHistory
          }
        >
          Previous interviews
        </button>
      </form>

      {history.length >
        0 && (
        <section className="result">
          <h2>
            Interview history
          </h2>

          {history.map(
            (
              item
            ) => (
              <p
                key={
                  item.sessionId
                }
              >
                <b>
                  {
                    item.focus
                  }
                </b>{" "}
                —{" "}
                {
                  item.answered
                }{" "}
                answers ·{" "}
                {
                  item.averageScore
                }
                % average
              </p>
            )
          )}
        </section>
      )}

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      {session && (
        <section className="result">
          <p>
            <small>
              Course retrieval:{" "}
              {
                session.provider
              }
              . Server voice uses
              ElevenLabs and
              Deepgram when
              configured.
            </small>
          </p>

          {session.questions.map(
            (
              question,
              index
            ) => {
              const isRecording =
                recordingQuestionId ===
                question.id;

              return (
                <article
                  className="assessment"
                  key={
                    question.id
                  }
                >
                  <h2>
                    {index +
                      1}
                    .{" "}
                    {
                      question.prompt
                    }
                  </h2>

                  <small>
                    Source:{" "}
                    {
                      question.sourceTitle
                    }
                  </small>

                  <p>
                    <button
                      type="button"
                      disabled={recordingQuestionId !== null && recordingQuestionId !== question.id}
                      onClick={() =>
                        speak(
                          question.prompt
                        )
                      }
                    >
                      🔊 Read
                      question
                    </button>{" "}

                    <button
                      type="button"
                      onClick={() =>
                        recordAnswer(
                          question.id
                        )
                      }
                    >
                      {isRecording
                        ? "⏹ Stop recording"
                        : "🎙️ Record answer"}
                    </button>
                  </p>

                  {isRecording && (
                    <p>
                      <strong>
                        Recording…
                      </strong>{" "}
                      Speak clearly,
                      then press Stop
                      recording.
                    </p>
                  )}

                  {transcriptionStatus[question.id] && (
                    <p><small>{transcriptionStatus[question.id]}</small></p>
                  )}

                  <textarea
                    value={
                      answers[
                        question
                          .id
                      ] ?? ""
                    }
                    onChange={(
                      event
                    ) =>
                      setAnswers(
                        (
                          current
                        ) => ({
                          ...current,

                          [question.id]:
                            event
                              .target
                              .value
                        })
                      )
                    }
                    placeholder="Answer in your own words, or record your answer…"
                  />

                  <button
                    disabled={
                      busy ||
                      isRecording ||
                      !answers[
                        question
                          .id
                      ]?.trim()
                    }
                    onClick={() =>
                      answer(
                        question.id
                      )
                    }
                    type="button"
                  >
                    Get feedback
                  </button>

                  {feedback[
                    question.id
                  ] && (
                    <p className="score">
                      {
                        feedback[
                          question
                            .id
                        ]
                      }
                    </p>
                  )}
                </article>
              );
            }
          )}

          <button
            onClick={
              loadReport
            }
            type="button"
          >
            View interview
            report
          </button>

          {report && (
            <p className="score">
              Average:{" "}
              {
                report.averageScore
              }
              % · Answered{" "}
              {
                report.answered
              }
              /
              {
                report.totalQuestions
              }
              .{" "}
              {
                report.feedback
              }
            </p>
          )}
        </section>
      )}
    </main>
  );
}
