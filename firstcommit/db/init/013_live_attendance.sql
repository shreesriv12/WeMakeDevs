CREATE TABLE IF NOT EXISTS live_attendance (
  room_id UUID NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  first_joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  PRIMARY KEY (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS live_attendance_room_idx ON live_attendance (room_id, last_seen_at DESC);
