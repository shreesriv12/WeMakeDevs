CREATE TABLE IF NOT EXISTS course_interview_sessions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  institution_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  focus TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (institution_id, class_id) REFERENCES classes(institution_id, id)
);
CREATE TABLE IF NOT EXISTS course_interview_turns (
  id UUID PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES course_interview_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  feedback TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_id)
);
