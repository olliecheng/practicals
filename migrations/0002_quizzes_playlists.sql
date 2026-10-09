-- Quizzes and playlists (see src/recall-drill/CLAUDE.md, Quizzes and playlists).
-- Ids are UUIDv7 strings, so ORDER BY id is chronological and no created_at column is needed.
-- D1 enforces foreign keys: a user who owns content cannot be deleted (RESTRICT); a deleted original only clears forked_from on its forks.

CREATE TABLE quizzes (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  forked_from TEXT REFERENCES quizzes (id) ON DELETE SET NULL,
  data        TEXT NOT NULL CHECK (json_valid(data))
);

CREATE TABLE playlists (
  id          TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  forked_from TEXT REFERENCES playlists (id) ON DELETE SET NULL,
  data        TEXT NOT NULL CHECK (json_valid(data))
);

CREATE INDEX quizzes_owner ON quizzes (owner_id);
CREATE INDEX playlists_owner ON playlists (owner_id);
-- Deleting a playlist nulls forked_from on its copies; this keeps that from scanning the table
CREATE INDEX playlists_forked_from ON playlists (forked_from);
