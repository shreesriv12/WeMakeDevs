CREATE TABLE institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE classes (
  id TEXT NOT NULL,
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  PRIMARY KEY (institution_id, id)
);

CREATE TABLE class_memberships (
  institution_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  PRIMARY KEY (institution_id, class_id, user_id),
  FOREIGN KEY (institution_id, class_id) REFERENCES classes(institution_id, id)
);

CREATE TABLE course_documents (
  id UUID PRIMARY KEY,
  institution_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  s3_key TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  ingestion_status TEXT NOT NULL DEFAULT 'uploaded',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (institution_id, class_id) REFERENCES classes(institution_id, id)
);

CREATE TABLE assessment_attempts (
  id UUID PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  institution_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (institution_id, class_id) REFERENCES classes(institution_id, id)
);

CREATE TABLE audit_events (
  audit_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  class_id TEXT,
  outcome TEXT NOT NULL,
  metadata JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX assessment_attempts_class_topic_idx ON assessment_attempts(institution_id, class_id, topic);
CREATE INDEX audit_events_institution_occurred_idx ON audit_events(institution_id, occurred_at DESC);

INSERT INTO institutions (id, name) VALUES ('demo-institute', 'ShikshaMesh Demo Institute') ON CONFLICT DO NOTHING;
INSERT INTO users (id, institution_id, role, display_name) VALUES
  ('student-391', 'demo-institute', 'student', 'Demo Student'),
  ('teacher-102', 'demo-institute', 'teacher', 'Demo Teacher') ON CONFLICT DO NOTHING;
INSERT INTO classes (id, institution_id, name) VALUES ('cn-b', 'demo-institute', 'Computer Networks - Section B') ON CONFLICT DO NOTHING;
INSERT INTO class_memberships (institution_id, class_id, user_id) VALUES
  ('demo-institute', 'cn-b', 'student-391'),
  ('demo-institute', 'cn-b', 'teacher-102') ON CONFLICT DO NOTHING;
