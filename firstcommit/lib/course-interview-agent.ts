import type { Actor } from "./auth";
import { retrieveKnowledge, type KnowledgeSource } from "./knowledge-retriever";
import { emitAudit } from "./audit";
import { generateWithOpenRouter } from "./voice-providers";
import { database, postgresEnabled } from "./postgres";

type InterviewQuestion = { id: string; prompt: string; expectedTerms: string[]; sourceTitle: string };
type InterviewTurn = { questionId: string; answer: string; score: number; feedback: string };
type InterviewSession = { id: string; actorId: string; institutionId: string; classId: string; focus: string; questions: InterviewQuestion[]; turns: InterviewTurn[]; sources: KnowledgeSource[] };

const sessions = new Map<string, InterviewSession>();
const stopwords = new Set(["the", "and", "for", "with", "that", "this", "from", "your", "have", "what", "when", "into", "about", "will", "are", "was", "has", "can", "how"]);

function terms(text: string) { return [...new Set((text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []).filter((word) => !stopwords.has(word)))].slice(0, 8); }

async function ensureInterviewActorScope(actor: Actor, classId: string) {
  const client = database();
  await client.query("INSERT INTO institutions (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", [actor.institutionId, actor.institutionId]);
  await client.query("INSERT INTO users (id, institution_id, role) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING", [actor.id, actor.institutionId, actor.role]);
  await client.query("INSERT INTO classes (id, institution_id, name) VALUES ($1, $2, $3) ON CONFLICT (institution_id, id) DO NOTHING", [classId, actor.institutionId, classId]);
  await client.query("INSERT INTO class_memberships (institution_id, class_id, user_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [actor.institutionId, classId, actor.id]);
}

function questionFrom(source: KnowledgeSource, index: number): InterviewQuestion {
  const excerpt = source.text.replace(/\s+/g, " ").trim(); const keyTerms = terms(excerpt);
  const anchor = excerpt.split(/[.!?]/).find((sentence) => sentence.trim().length > 30)?.trim() ?? excerpt.slice(0, 220);
  return { id: `interview-q-${index + 1}`, prompt: `Using your uploaded notes, explain this idea in your own words: “${anchor.slice(0, 280)}”`, expectedTerms: keyTerms, sourceTitle: source.title };
}

async function loadSession(actor: Actor, sessionId: string) {
  const cached = sessions.get(sessionId); if (cached) return cached;
  if (!postgresEnabled()) return undefined;
  const stored = await database().query<{ id: string; student_id: string; institution_id: string; class_id: string; focus: string; questions: InterviewQuestion[] }>("SELECT id, student_id, institution_id, class_id, focus, questions FROM course_interview_sessions WHERE id = $1", [sessionId]);
  const row = stored.rows[0]; if (!row || row.student_id !== actor.id || row.institution_id !== actor.institutionId) return undefined;
  const turns = await database().query<InterviewTurn>("SELECT question_id AS \"questionId\", ''::text AS answer, score, feedback FROM course_interview_turns WHERE session_id = $1 ORDER BY created_at", [sessionId]);
  const session = { id: row.id, actorId: row.student_id, institutionId: row.institution_id, classId: row.class_id, focus: row.focus, questions: row.questions, turns: turns.rows, sources: [] }; sessions.set(sessionId, session); return session;
}

async function createQuestions(sources: KnowledgeSource[]) {
  const fallback = sources.map(questionFrom);
  const provider = process.env.INTERVIEW_GENERATION_PROVIDER ?? "openrouter";
  if (provider !== "openrouter" || !process.env.OPENROUTER_API_KEY) return fallback;
  try {
    const context = sources.map((source) => `[${source.title}] ${source.text}`).join("\n\n").slice(0, 12000);
    const prompt = `Create exactly ${sources.length} oral interview questions using only these course notes. Return JSON only: {"questions":[{"prompt":string,"sourceIndex":number}]}. Questions must test understanding, not ask about facts absent from the notes. Notes: ${context}`;
    const text = await generateWithOpenRouter(prompt);
    const parsed = text ? JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim()) : null;
    if (!Array.isArray(parsed?.questions) || parsed.questions.length !== sources.length) throw new Error("Invalid interview question response");
    return parsed.questions.map((item: { prompt?: unknown; sourceIndex?: unknown }, index: number) => {
      const sourceIndex = typeof item.sourceIndex === "number" && item.sourceIndex >= 0 && item.sourceIndex < sources.length ? item.sourceIndex : index;
      if (typeof item.prompt !== "string" || item.prompt.length < 10) throw new Error("Invalid interview prompt");
      return { id: `interview-q-${index + 1}`, prompt: item.prompt, expectedTerms: terms(sources[sourceIndex].text), sourceTitle: sources[sourceIndex].title };
    });
  } catch { return fallback; }
}

export async function startCourseInterview(actor: Actor, input: { classId: string; focus: string }) {
  if (!actor.classIds.includes(input.classId)) throw new Error("Not authorized for this class");
  const retrieval = await retrieveKnowledge({ institutionId: actor.institutionId, classId: input.classId, query: input.focus, limit: 3 });
  if (!retrieval.sources.length) throw new Error("No authorized course notes were found for this interview topic");
  const session: InterviewSession = { id: `interview-${crypto.randomUUID()}`, actorId: actor.id, institutionId: actor.institutionId, classId: input.classId, focus: input.focus, questions: await createQuestions(retrieval.sources), turns: [], sources: retrieval.sources };
  sessions.set(session.id, session);
  if (postgresEnabled()) await ensureInterviewActorScope(actor, input.classId).then(() => database().query("INSERT INTO course_interview_sessions (id, student_id, institution_id, class_id, focus, questions) VALUES ($1,$2,$3,$4,$5,$6)", [session.id, actor.id, actor.institutionId, input.classId, input.focus, JSON.stringify(session.questions)])).catch(() => undefined);
  void emitAudit({ auditId: `audit-${crypto.randomUUID().slice(0, 8)}`, eventType: "course_interview.started", actorId: actor.id, institutionId: actor.institutionId, classId: input.classId, outcome: "success", metadata: { sourceCount: retrieval.sources.length, retrievalProvider: retrieval.provider } }).catch(() => undefined);
  return { sessionId: session.id, focus: session.focus, provider: retrieval.provider, questions: session.questions.map(({ expectedTerms: _, ...question }) => question) };
}

export async function answerCourseInterview(actor: Actor, sessionId: string, questionId: string, answer: string) {
  const session = await loadSession(actor, sessionId);
  if (!session || session.actorId !== actor.id || session.institutionId !== actor.institutionId) throw new Error("Interview session not found");
  const question = session.questions.find((item) => item.id === questionId); if (!question) throw new Error("Interview question not found");
  if (session.turns.some((turn) => turn.questionId === questionId)) throw new Error("This question has already been answered");
  const answerTerms = new Set(terms(answer)); const matches = question.expectedTerms.filter((term) => answerTerms.has(term));
  let score = Math.min(100, Math.round((matches.length / Math.max(1, question.expectedTerms.length)) * 75) + Math.min(25, Math.floor(answer.trim().length / 24)));
  let feedback = score >= 70 ? "Good answer: you used key ideas from the uploaded notes. Add one concrete example for an even stronger response." : `Review the note section “${question.sourceTitle}” and explain the core terms in your own words.`;
  if (process.env.INTERVIEW_ANSWER_EVALUATOR === "openrouter") try {
    const text = await generateWithOpenRouter(`Evaluate this student interview answer only against the supplied course concepts. Return JSON only: {"score":number,"feedback":string}. Score 0-100 for relevance, clarity, and completeness. Do not make claims beyond the concepts. Question: ${question.prompt}\nCourse concepts: ${question.expectedTerms.join(", ")}\nStudent answer: ${answer}`);
    const evaluated = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim()) as { score?: unknown; feedback?: unknown };
    if (typeof evaluated.score === "number" && evaluated.score >= 0 && evaluated.score <= 100 && typeof evaluated.feedback === "string" && evaluated.feedback.length > 5) { score = Math.round(evaluated.score); feedback = evaluated.feedback.slice(0, 800); }
  } catch { /* deterministic rubric is the safe fallback */ }
  const turn = { questionId, answer, score, feedback }; session.turns.push(turn);
  if (postgresEnabled()) await database().query("INSERT INTO course_interview_turns (id, session_id, question_id, score, feedback) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (session_id, question_id) DO NOTHING", [crypto.randomUUID(), session.id, questionId, score, feedback]).catch(() => undefined);
  void emitAudit({ auditId: `audit-${crypto.randomUUID().slice(0, 8)}`, eventType: "course_interview.answer_scored", actorId: actor.id, institutionId: actor.institutionId, classId: session.classId, outcome: "success", metadata: { score, questionId } }).catch(() => undefined);
  return turn;
}

export async function courseInterviewReport(actor: Actor, sessionId: string) {
  const session = await loadSession(actor, sessionId);
  if (!session || session.actorId !== actor.id || session.institutionId !== actor.institutionId) throw new Error("Interview session not found");
  const averageScore = session.turns.length ? Math.round(session.turns.reduce((sum, turn) => sum + turn.score, 0) / session.turns.length) : 0;
  return { sessionId, focus: session.focus, answered: session.turns.length, totalQuestions: session.questions.length, averageScore, feedback: averageScore >= 70 ? "You demonstrated good note-grounded understanding." : "Revisit the cited note sections, then retry the interview.", turns: session.turns.map(({ answer: _, ...turn }) => turn) };
}

export async function listCourseInterviews(actor: Actor) {
  if (!postgresEnabled()) return [...sessions.values()].filter((session) => session.actorId === actor.id && session.institutionId === actor.institutionId).map((session) => ({ sessionId: session.id, focus: session.focus, answered: session.turns.length, averageScore: session.turns.length ? Math.round(session.turns.reduce((sum, turn) => sum + turn.score, 0) / session.turns.length) : 0 }));
  const rows = await database().query<{ id: string; focus: string; answered: string; average_score: string | null }>("SELECT s.id, s.focus, COUNT(t.id)::text AS answered, AVG(t.score)::text AS average_score FROM course_interview_sessions s LEFT JOIN course_interview_turns t ON t.session_id = s.id WHERE s.student_id = $1 AND s.institution_id = $2 GROUP BY s.id, s.focus, s.created_at ORDER BY s.created_at DESC LIMIT 20", [actor.id, actor.institutionId]);
  return rows.rows.map((row) => ({ sessionId: row.id, focus: row.focus, answered: Number(row.answered), averageScore: row.average_score ? Math.round(Number(row.average_score)) : 0 }));
}
