-- Optional, run by hand in the D1 console AFTER you first sign in with Google.
-- Moves the history of a legacy placeholder account (migrations/0001_accounts.sql) onto your real user.
-- Find your id:  SELECT id, email FROM users WHERE email = 'you@example.com';
-- Replace :real with it and :legacy with 'ollie' or 'proshot'.

UPDATE history SET user_id = :real WHERE user_id = :legacy
  AND NOT EXISTS (SELECT 1 FROM history h WHERE h.user_id = :real AND h.quiz_id = history.quiz_id);

-- Once quizzes and playlists exist (Phase 2), also hand over ownership of the built-in content:
-- UPDATE quizzes   SET owner_id = :real WHERE owner_id = :legacy;
-- UPDATE playlists SET owner_id = :real WHERE owner_id = :legacy;
