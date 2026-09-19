CREATE TABLE IF NOT EXISTS concept_xray_sessions (
  id UUID PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  institution_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  focus TEXT NOT NULL,
  input_kind TEXT NOT NULL CHECK (input_kind IN ('text', 'voice', 'code', 'canvas')),
  evidence TEXT NOT NULL,
  diagnosis JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (institution_id, class_id) REFERENCES classes(institution_id, id)
);
CREATE INDEX IF NOT EXISTS concept_xray_student_created_idx ON concept_xray_sessions (institution_id, student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS concept_xray_recoveries (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES concept_xray_sessions(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  feedback TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
