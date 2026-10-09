-- Accounts v2: Google sign-in (Better Auth) and per-quiz history.
-- Run once, after a backup: npx wrangler d1 export practicals --remote --output backup.sql
--   npx wrangler d1 migrations apply practicals --remote
-- Apply it only when the new Worker is ready to deploy: it drops the old username-only `users` table.

-- 1. Free the name `users`. The old table was created lazily by the previous Worker, so make sure it exists.
CREATE TABLE IF NOT EXISTS users (name TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL);
ALTER TABLE users RENAME TO legacy_users;

-- 2. History: one row per user per quiz. user_id is a users.id (no foreign key), quiz_id the legacy drill key until quizzes move into the database.
CREATE TABLE history (
  user_id TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  data    TEXT NOT NULL CHECK (json_valid(data)),
  updated INTEGER NOT NULL,
  PRIMARY KEY (user_id, quiz_id)
) WITHOUT ROWID;

-- 3. Copy each saved drill, user_id = the old username.
INSERT INTO history (user_id, quiz_id, data, updated)
SELECT u.name, d.key, json_set(d.value, '$.starred', json('false')), u.updated
FROM legacy_users u, json_each(u.data, '$.drills') d
WHERE json_valid(u.data);

-- 4. Apply stars: new rows hold only {"starred":true}. (The WHERE is needed for INSERT ... SELECT ... ON CONFLICT to parse.)
INSERT INTO history (user_id, quiz_id, data, updated)
SELECT u.name, s.value, json('{"starred":true}'), u.updated
FROM legacy_users u, json_each(u.data, '$.stars') s
WHERE json_valid(u.data)
ON CONFLICT (user_id, quiz_id) DO UPDATE SET data = json_set(history.data, '$.starred', json('true'));

-- 5. Better Auth tables (columns and types as generated for worker/auth.js; dates are ISO strings, booleans 0/1).
CREATE TABLE users (
  id              TEXT PRIMARY KEY NOT NULL,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  emailVerified   INTEGER NOT NULL DEFAULT 0,
  image           TEXT,
  createdAt       DATE NOT NULL,
  updatedAt       DATE NOT NULL,
  username        TEXT,
  displayUsername TEXT,
  role            TEXT,
  banned          INTEGER DEFAULT 0,
  banReason       TEXT,
  banExpires      DATE
);
CREATE UNIQUE INDEX users_email_unique ON users (email);
CREATE UNIQUE INDEX users_username_unique ON users (username);

CREATE TABLE sessions (
  id             TEXT PRIMARY KEY NOT NULL,
  expiresAt      DATE NOT NULL,
  token          TEXT NOT NULL,
  createdAt      DATE NOT NULL,
  updatedAt      DATE NOT NULL,
  ipAddress      TEXT,
  userAgent      TEXT,
  userId         TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  impersonatedBy TEXT
);
CREATE UNIQUE INDEX sessions_token_unique ON sessions (token);
CREATE INDEX sessions_userId_idx ON sessions (userId);

CREATE TABLE accounts (
  id                    TEXT PRIMARY KEY NOT NULL,
  accountId             TEXT NOT NULL,
  providerId            TEXT NOT NULL,
  userId                TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  accessToken           TEXT,
  refreshToken          TEXT,
  idToken               TEXT,
  accessTokenExpiresAt  DATE,
  refreshTokenExpiresAt DATE,
  scope                 TEXT,
  password              TEXT,
  createdAt             DATE NOT NULL,
  updatedAt             DATE NOT NULL
);
CREATE INDEX accounts_userId_idx ON accounts (userId);

CREATE TABLE verifications (
  id         TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value      TEXT NOT NULL,
  expiresAt  DATE NOT NULL,
  createdAt  DATE NOT NULL,
  updatedAt  DATE NOT NULL
);
CREATE INDEX verifications_identifier_idx ON verifications (identifier);

CREATE TABLE rateLimits (
  id          TEXT PRIMARY KEY NOT NULL,
  key         TEXT NOT NULL,
  count       INTEGER NOT NULL,
  lastRequest INTEGER NOT NULL
);
CREATE UNIQUE INDEX rateLimits_key_unique ON rateLimits (key);

-- 6. One placeholder user per legacy name (id = name). They never match a Google sign-in; history stays attached to them until claimed (scripts/claim-legacy.example.sql).
INSERT INTO users (id, name, email, emailVerified, createdAt, updatedAt)
SELECT name, name, name || '@legacy.invalid', 0,
       strftime('%Y-%m-%dT%H:%M:%fZ', updated / 1000.0, 'unixepoch'),
       strftime('%Y-%m-%dT%H:%M:%fZ', updated / 1000.0, 'unixepoch')
FROM legacy_users;

DROP TABLE legacy_users;
