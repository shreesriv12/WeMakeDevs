ALTER TABLE course_documents ADD COLUMN IF NOT EXISTS ingestion_job_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS course_documents_ingestion_job_idx ON course_documents (ingestion_job_id) WHERE ingestion_job_id IS NOT NULL;
