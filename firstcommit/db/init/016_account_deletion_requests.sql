CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('requested', 'completed', 'cancelled')) DEFAULT 'requested',
  UNIQUE (institution_id, user_id, status)
);

CREATE INDEX IF NOT EXISTS account_deletion_requests_pending_idx
  ON account_deletion_requests (institution_id, requested_at)
  WHERE status = 'requested';
