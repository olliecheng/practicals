-- Global settings shared by every user (see src/recall-drill/CLAUDE.md, Settings). One row per setting key; `data` is its JSON value.
-- A key with no row falls back to the default in worker/settings.js.

CREATE TABLE settings (
  key  TEXT PRIMARY KEY,
  data TEXT NOT NULL CHECK (json_valid(data))
);
