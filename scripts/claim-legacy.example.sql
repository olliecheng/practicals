-- Optional, run by hand in the D1 console AFTER you first sign in with Google.
-- Moves the history of a legacy placeholder account (migrations/0001_accounts.sql) onto your real user.
-- Find your id:  SELECT id, email FROM users WHERE email = 'you@example.com';
-- Replace :real with it and :legacy with 'ollie' or 'proshot'.

UPDATE history SET user_id = :real WHERE user_id = :legacy
  AND NOT EXISTS (SELECT 1 FROM history h WHERE h.user_id = :real AND h.quiz_id = history.quiz_id);

-- The built-in quizzes and playlists (migration 0003) are owned by the placeholder user 'ollie'; to take them over, run:
UPDATE quizzes   SET owner_id = :real WHERE owner_id = :legacy;
UPDATE playlists SET owner_id = :real WHERE owner_id = :legacy;
