CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY,
  institution_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  source_document_id UUID REFERENCES course_documents(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'closed')) DEFAULT 'draft',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (institution_id, class_id) REFERENCES classes(institution_id, id)
);
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option INTEGER NOT NULL CHECK (correct_option BETWEEN 0 AND 3)
);
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES quizzes(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  institution_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  submitted_at TIMESTAMPTZ,
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  FOREIGN KEY (institution_id, class_id) REFERENCES classes(institution_id, id)
);
CREATE TABLE IF NOT EXISTS quiz_answers (
  attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id),
  selected_option INTEGER NOT NULL CHECK (selected_option BETWEEN 0 AND 3),
  is_correct BOOLEAN NOT NULL,
  PRIMARY KEY (attempt_id, question_id)
);
CREATE INDEX IF NOT EXISTS quiz_attempts_student_idx ON quiz_attempts (institution_id, student_id, submitted_at DESC);
