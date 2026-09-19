ALTER TABLE assessment_attempts ADD COLUMN IF NOT EXISTS question_id TEXT;
ALTER TABLE assessment_attempts ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard'));
CREATE INDEX IF NOT EXISTS assessment_attempts_student_submitted_idx ON assessment_attempts(institution_id, student_id, submitted_at);
