CREATE TABLE IF NOT EXISTS shared_canvas_workspaces (
  id UUID PRIMARY KEY,
  institution_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  workspace_key TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, class_id, workspace_key),
  FOREIGN KEY (institution_id, class_id) REFERENCES classes(institution_id, id)
);
