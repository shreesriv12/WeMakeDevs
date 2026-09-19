CREATE TABLE IF NOT EXISTS quiz_workflow_runs (
  execution_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('local', 'step-functions')),
  requested_by TEXT NOT NULL REFERENCES users(id),
  institution_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  lecture_source_id TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  input JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (institution_id, class_id) REFERENCES classes(institution_id, id)
);

CREATE INDEX IF NOT EXISTS quiz_workflow_runs_owner_idx ON quiz_workflow_runs (institution_id, requested_by, started_at DESC);
