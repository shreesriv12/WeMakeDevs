import { BedrockAgentRuntimeClient, RetrieveCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";

const letters = ["A", "B", "C", "D"];
const questionCount = 5;
const awsRegion = process.env.AWS_REGION || "us-east-1";
const bedrockRetrieve = new BedrockAgentRuntimeClient({ region: awsRegion });
const bedrockRuntime = new BedrockRuntimeClient({ region: awsRegion });
const translateClient = new TranslateClient({ region: awsRegion });
const eventBridge = new EventBridgeClient({ region: awsRegion });
const languageCodes = { hindi: "hi", english: "en", bengali: "bn", tamil: "ta", telugu: "te", marathi: "mr", gujarati: "gu", kannada: "kn", malayalam: "ml", punjabi: "pa", urdu: "ur" };

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

async function retrieveBedrockContext(input) {
  const knowledgeBaseId = process.env.BEDROCK_KNOWLEDGE_BASE_ID;
  if (!knowledgeBaseId) return "";
  const filter = { andAll: [
    { equals: { key: "institutionId", value: input.institutionId } },
    { equals: { key: "classId", value: input.classId } },
    { equals: { key: "documentId", value: input.lectureSourceId } }
  ] };
  const response = await bedrockRetrieve.send(new RetrieveCommand({ knowledgeBaseId, retrievalQuery: { text: `Create a ${input.difficulty || "medium"} quiz from this course document.` }, retrievalConfiguration: { vectorSearchConfiguration: { numberOfResults: 5, filter } } }));
  return (response.retrievalResults || []).flatMap(result => typeof result.content?.text === "string" ? [result.content.text] : []).join("\n\n").slice(0, 12000);
}

async function bedrockQuestions(input) {
  if (process.env.ENABLE_BEDROCK_QUIZ_GENERATION !== "true") return null;
  const modelId = process.env.BEDROCK_QUIZ_MODEL_ID || process.env.BEDROCK_TUTOR_MODEL_ID;
  if (!modelId) throw new Error("BEDROCK_QUIZ_MODEL_ID or BEDROCK_TUTOR_MODEL_ID is not configured");
  const courseContext = await retrieveBedrockContext(input);
  if (!courseContext) throw new Error("No authorized Bedrock Knowledge Base chunks were retrieved");
  const prompt = [
    "Create exactly five multiple-choice questions for a school quiz.",
    `Difficulty: ${input.difficulty || "medium"}.`,
    "Use only the authorized course excerpts below; do not invent facts.",
    "Return JSON only: {\"questions\":[{\"prompt\":string,\"options\":[string,string,string,string],\"correctOption\":0}]}",
    courseContext
  ].join("\n\n");
  const response = await bedrockRuntime.send(new ConverseCommand({ modelId, messages: [{ role: "user", content: [{ text: prompt }] }], inferenceConfig: { maxTokens: 1800, temperature: 0.2 } }));
  const text = response.output?.message?.content?.flatMap(item => typeof item.text === "string" ? [item.text] : []).join("") || "";
  return parseQuestions(text, input.difficulty);
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
    return (await bedrockQuestions(input)) || (await openRouterQuestions(input)) || fallbackQuestions(input);
  } catch (error) {
    console.warn("Primary quiz generation failed; trying safe fallback", { message: error instanceof Error ? error.message : "unknown" });
    try { return (await openRouterQuestions(input)) || fallbackQuestions(input); } catch { return fallbackQuestions(input); }
  }
}

async function translateQuiz(input) {
  const targetLanguage = languageCodes[String(input.language || "").toLowerCase()] || String(input.language || "").toLowerCase();
  if (process.env.ENABLE_AWS_TRANSLATE === "true" && targetLanguage && targetLanguage !== "en") {
    try {
      const questions = [];
      for (const question of input.quiz.questions) {
        const prompt = await translateClient.send(new TranslateTextCommand({ SourceLanguageCode: "en", TargetLanguageCode: targetLanguage, Text: question.prompt }));
        const options = [];
        for (const option of question.options) {
          const translated = await translateClient.send(new TranslateTextCommand({ SourceLanguageCode: "en", TargetLanguageCode: targetLanguage, Text: option }));
          options.push(translated.TranslatedText || option);
        }
        questions.push({ ...question, prompt: prompt.TranslatedText || question.prompt, options });
      }
      return { language: input.language, quizId: input.quiz.id, status: "ready", provider: "amazon-translate", quiz: { ...input.quiz, questions } };
    } catch (error) { console.warn("Amazon Translate failed; using next translation fallback", { message: error instanceof Error ? error.message : "unknown" }); }
  }
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

async function publishWorkflowEvent(detailType, detail) {
  const eventBusName = process.env.AUDIT_EVENT_BUS_NAME;
  if (!eventBusName) return false;
  const response = await eventBridge.send(new PutEventsCommand({ Entries: [{ EventBusName: eventBusName, Source: "shikshamesh.quiz", DetailType: detailType, Detail: JSON.stringify(detail) }] }));
  if ((response.FailedEntryCount || 0) > 0) throw new Error("EventBridge rejected quiz workflow event");
  return true;
}

function workflowLog(event, status, details = {}) {
  // JSON console output is captured by the existing AWSLambdaBasicExecutionRole in CloudWatch.
  // It intentionally excludes student identifiers, answers, question text, and document content.
  console.log(JSON.stringify({ service: "shikshamesh-quiz-worker", stage: event.stage, status, classId: event.classId, institutionId: event.institutionId, timestamp: new Date().toISOString(), ...details }));
}

export async function handler(event) {
  workflowLog(event, "started");
  switch (event.stage) {
    case "generate":
      { const quiz = { id: crypto.randomUUID(), classId: event.classId, questions: await questions(event) }; workflowLog(event, "completed", { questionCount: quiz.questions.length }); return { ...event, quiz }; }
    case "translate":
      { const translation = await translateQuiz(event); workflowLog(event, "completed", { provider: translation.provider, language: event.language }); return { ...event, translation }; }
    case "notify":
      { const provider = await publishWorkflowEvent("QuizNotificationScheduled", { quizId: event.quiz.id, scheduledFor: event.scheduledFor, languageCount: Array.isArray(event.translations) ? event.translations.length : 0 }) ? "eventbridge" : "workflow"; workflowLog(event, "completed", { provider }); return { ...event, notification: { scheduledFor: event.scheduledFor, status: "scheduled", provider } }; }
    case "analytics":
      { const provider = await publishWorkflowEvent("QuizAnalyticsInitialized", { quizId: event.quiz.id, institutionId: event.institutionId, questionCount: event.quiz.questions?.length || 0 }) ? "eventbridge" : "workflow"; workflowLog(event, "completed", { provider, questionCount: event.quiz.questions?.length || 0 }); return { ...event, analytics: { quizId: event.quiz.id, status: "pending-submissions", provider } }; }
    default:
      throw new Error("Unknown ShikshaMesh quiz worker stage");
  }
}
