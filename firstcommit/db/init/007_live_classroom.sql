CREATE TABLE IF NOT EXISTS live_rooms (
  id UUID PRIMARY KEY,
  institution_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (institution_id, class_id) REFERENCES classes(institution_id, id)
);
CREATE TABLE IF NOT EXISTS live_messages (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES live_rooms(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('student','teacher','admin')),
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 2000),
  attachment_type TEXT CHECK (attachment_type IN ('canvas','code','geometry','document')),
  attachment_object_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS live_messages_room_idx ON live_messages (room_id, created_at);
