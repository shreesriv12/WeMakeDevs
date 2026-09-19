import type { Actor } from "./auth";
import { database, postgresEnabled } from "./postgres";
import { persistAssessmentResults } from "./assessment-store";
import { learnerMastery } from "./adaptive-assessment";

type QuizQuestion = { id: string; topic: string; difficulty: "easy" | "medium" | "hard"; prompt: string; options: string[]; correctOption: number };

export async function listPublishedQuizzes(actor: Actor, classId: string) {
  if (!actor.classIds.includes(classId) && actor.role !== "admin") throw new Error("Not authorized for this class");
  if (!postgresEnabled()) return [];
  const result = await database().query<{ id: string; title: string; created_at: Date }>("SELECT id, title, created_at FROM quizzes WHERE institution_id = $1 AND class_id = $2 AND status = 'published' ORDER BY created_at DESC", [actor.institutionId, classId]);
  return result.rows.map((row) => ({ id: row.id, title: row.title, createdAt: row.created_at.toISOString() }));
}

export async function getQuizForStudent(actor: Actor, quizId: string) {
  if (!postgresEnabled()) throw new Error("Quiz storage requires PostgreSQL");
  const quiz = await database().query<{ id: string; title: string; class_id: string }>("SELECT id, title, class_id FROM quizzes WHERE id = $1 AND institution_id = $2 AND status = 'published'", [quizId, actor.institutionId]);
  const row = quiz.rows[0]; if (!row || (!actor.classIds.includes(row.class_id) && actor.role !== "admin")) throw new Error("Quiz not found");
  const questions = await database().query<Omit<QuizQuestion, "correctOption"> & { options: string[] }>("SELECT id, topic, difficulty, prompt, options FROM quiz_questions WHERE quiz_id = $1 ORDER BY id", [quizId]);
  return { id: row.id, title: row.title, classId: row.class_id, questions: questions.rows };
}

export async function submitQuiz(actor: Actor, quizId: string, answers: { questionId: string; selectedOption: number }[]) {
  if (!postgresEnabled()) throw new Error("Quiz storage requires PostgreSQL");
  const quiz = await getQuizForStudent(actor, quizId);
  const keys = await database().query<QuizQuestion>("SELECT id, topic, difficulty, prompt, options, correct_option AS \"correctOption\" FROM quiz_questions WHERE quiz_id = $1", [quizId]);
  const chosen = new Map(answers.map((answer) => [answer.questionId, answer.selectedOption])); const scored = keys.rows.filter((question) => chosen.has(question.id)).map((question) => ({ question, selectedOption: chosen.get(question.id)!, correct: chosen.get(question.id) === question.correctOption }));
  const attemptId = crypto.randomUUID(); const score = scored.length ? Math.round(scored.filter((item) => item.correct).length * 100 / scored.length) : 0;
  const client = database(); await client.query("INSERT INTO quiz_attempts (id, quiz_id, student_id, institution_id, class_id, submitted_at, score) VALUES ($1,$2,$3,$4,$5,now(),$6)", [attemptId, quizId, actor.id, actor.institutionId, quiz.classId, score]);
  for (const item of scored) await client.query("INSERT INTO quiz_answers (attempt_id, question_id, selected_option, is_correct) VALUES ($1,$2,$3,$4)", [attemptId, item.question.id, item.selectedOption, item.correct]);
  const masteryPersistence = await persistAssessmentResults(actor, scored.map((item) => ({ questionId: item.question.id, topic: item.question.topic, difficulty: item.question.difficulty, correct: item.correct })));
  const mastery = await learnerMastery(actor);
  return { attemptId, score, attempted: scored.length, correct: scored.filter((item) => item.correct).length, masteryPersistence, mastery };
}
