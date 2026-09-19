-- A human-readable stable room key lets Socket.IO rooms map safely to durable rooms.
ALTER TABLE live_rooms ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS live_rooms_scope_slug_idx
  ON live_rooms (institution_id, class_id, slug)
  WHERE slug IS NOT NULL;
