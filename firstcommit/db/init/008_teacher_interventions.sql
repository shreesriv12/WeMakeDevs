CREATE TABLE IF NOT EXISTS teacher_interventions (
  id UUID PRIMARY KEY,
  institution_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  concept TEXT NOT NULL,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('recommended', 'approved')) DEFAULT 'recommended',
  plan JSONB NOT NULL,
  signal JSONB NOT NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS teacher_interventions_class_created_idx ON teacher_interventions (institution_id, class_id, created_at DESC);
