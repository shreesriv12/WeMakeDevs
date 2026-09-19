CREATE TABLE IF NOT EXISTS mastery_training_consents (
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (institution_id, user_id)
);
