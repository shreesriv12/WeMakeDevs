CREATE TABLE IF NOT EXISTS diagram_templates (
  id UUID PRIMARY KEY,
  institution_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  title TEXT NOT NULL,
  diagram_kind TEXT NOT NULL CHECK (diagram_kind IN ('flowchart','sequence','class','state','er')),
  mermaid_code TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (institution_id, class_id) REFERENCES classes(institution_id, id)
);
CREATE INDEX IF NOT EXISTS diagram_templates_class_idx ON diagram_templates (institution_id, class_id, updated_at DESC);
