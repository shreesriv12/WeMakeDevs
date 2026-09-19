ALTER TABLE live_rooms ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE live_rooms ADD COLUMN IF NOT EXISTS duration_minutes INTEGER CHECK (duration_minutes BETWEEN 5 AND 240);
ALTER TABLE live_rooms ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled'));
ALTER TABLE live_rooms ADD COLUMN IF NOT EXISTS agenda JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS live_rooms_class_schedule_idx ON live_rooms (institution_id, class_id, scheduled_for DESC);
