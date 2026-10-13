-- Autosaved rounds in progress: one row per user per quiz (see src/recall-drill/CLAUDE.md, Autosave).
-- `data` is the round's snapshot (found / credited / revealed / ... as item labels); the row is deleted when the round is finished.
-- `updated` is epoch milliseconds; the client compares it with its own clock to decide whether to ask before resuming.
-- Additive (one new table). Back up first: npx wrangler d1 export practicals --remote --output backup.sql
--   npx wrangler d1 migrations apply practicals --remote

CREATE TABLE quiz_progress (
  user_id TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  data    TEXT NOT NULL CHECK (json_valid(data)),
  updated INTEGER NOT NULL,
  PRIMARY KEY (user_id, quiz_id)
) WITHOUT ROWID;
