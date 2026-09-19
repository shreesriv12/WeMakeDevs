const letters = ["A", "B", "C", "D"];
const questionCount = 5;

async function generateWithOpenRouter(prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENROUTER_QUIZ_MODEL || process.env.OPENROUTER_INTERVIEW_MODEL || "meta-llama/llama-3.3-70b-instruct", messages: [{ role: "user", content: prompt }], temperature: 0.2 })
  });
  if (!response.ok) throw new Error(`OpenRouter generation failed (${response.status})`);
  const body = await response.json();
  return body.choices?.[0]?.message?.content || "";
}

function fallbackQuestions(input) {
  return Array.from({ length: questionCount }, (_, index) => ({
    id: `q-${index + 1}`,
    prompt: `Question ${index + 1}: Explain a key concept from ${input.lectureSourceId}.`,
    options: letters.map((letter) => `${letter}. Example answer ${letter}`),
    correctOption: 0,
    difficulty: input.difficulty
  }));
}

function parseQuestions(text, difficulty) {
  const payload = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim());
  if (!Array.isArray(payload.questions) || payload.questions.length !== questionCount) throw new Error("Expected five quiz questions");
  return payload.questions.map((item, index) => {
    if (typeof item?.prompt !== "string" || !Array.isArray(item.options) || item.options.length !== 4 || !Number.isInteger(item.correctOption) || item.correctOption < 0 || item.correctOption > 3) throw new Error("Invalid quiz question shape");
    return { id: `q-${index + 1}`, prompt: item.prompt, options: item.options, correctOption: item.correctOption, difficulty };
  });
}

async function retrieveCourseContext(input) {
  const url = process.env.QDRANT_URL?.replace(/\/$/, "");
  const apiKey = process.env.QDRANT_API_KEY;
  if (!url || !apiKey) return "";
  const response = await fetch(`${url}/collections/${encodeURIComponent(process.env.QDRANT_COLLECTION || "shikshamesh-course-chunks")}/points/scroll`, {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({ limit: 4, with_payload: true, filter: { must: [
      { key: "institutionId", match: { value: input.institutionId } },
      { key: "classId", match: { value: input.classId } },
      { key: "documentId", match: { value: input.lectureSourceId } }
    ] } })
  });
  if (!response.ok) throw new Error(`Qdrant course lookup failed (${response.status})`);
  const body = await response.json();
  return (body.result?.points || []).flatMap((point) => typeof point.payload?.text === "string" ? [point.payload.text] : []).join("\n\n").slice(0, 12000);
}

async function openRouterQuestions(input) {
  if (process.env.OPENROUTER_API_KEY == null || input.useOpenRouter !== true) return null;
  const courseContext = await retrieveCourseContext(input);
  if (!courseContext) throw new Error("No authorized course chunks were retrieved");
  const prompt = [
    "Create exactly five multiple-choice questions for a school quiz.",
    `Difficulty: ${input.difficulty || "medium"}.`,
    `Teacher lecture identifier: ${input.lectureSourceId}. Use only the following authorized course excerpts; do not invent facts beyond them: ${courseContext}`,
    "Return JSON only: {\"questions\":[{\"prompt\":string,\"options\":[string,string,string,string],\"correctOption\":0}]}.",
    "Each question must have exactly four options and one correct zero-based option index."
  ].join(" ");
  const text = await generateWithOpenRouter(prompt);
  return typeof text === "string" ? parseQuestions(text, input.difficulty) : null;
}

async function questions(input) {
  try {
    return (await openRouterQuestions(input)) || fallbackQuestions(input);
  } catch (error) {
    console.warn("OpenRouter quiz generation failed; using deterministic fallback", { message: error instanceof Error ? error.message : "unknown" });
    return fallbackQuestions(input);
  }
}

async function translateQuiz(input) {
  if (!process.env.OPENROUTER_API_KEY) return { language: input.language, quizId: input.quiz.id, status: "ready", provider: "deterministic" };
  try {
    const text = await generateWithOpenRouter(`Translate only the human-facing prompt and option text in this quiz to ${input.language}. Preserve IDs, question order, exactly four options, correctOption values, and difficulty. Return JSON only with {"questions":[{"id":string,"prompt":string,"options":[string,string,string,string],"correctOption":number,"difficulty":string}]}. Quiz: ${JSON.stringify(input.quiz)}`);
    const translated = text ? JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim()) : null;
    if (!Array.isArray(translated?.questions) || translated.questions.length !== input.quiz.questions.length || translated.questions.some((question) => !Array.isArray(question.options) || question.options.length !== 4)) throw new Error("Invalid translated quiz shape");
    return { language: input.language, quizId: input.quiz.id, status: "ready", provider: "openrouter", quiz: { ...input.quiz, questions: translated.questions } };
  } catch (error) {
    console.warn("OpenRouter translation failed; using deterministic fallback", { message: error instanceof Error ? error.message : "unknown" });
    return { language: input.language, quizId: input.quiz.id, status: "ready", provider: "deterministic-fallback" };
  }
}

export async function handler(event) {
  switch (event.stage) {
    case "generate":
      return { ...event, quiz: { id: crypto.randomUUID(), classId: event.classId, questions: await questions(event) } };
    case "translate":
      return { ...event, translation: await translateQuiz(event) };
    case "notify":
      return { ...event, notification: { scheduledFor: event.scheduledFor, status: "scheduled" } };
    case "analytics":
      return { ...event, analytics: { quizId: event.quiz.id, status: "pending-submissions" } };
    default:
      throw new Error("Unknown ShikshaMesh quiz worker stage");
  }
}
