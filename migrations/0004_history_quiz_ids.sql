-- history.quiz_id: legacy drill key (`mode|system|name`) -> the built-in quiz's id (migration 0003), for every row, stars included.
-- Apply it in the same release as the client that keys drills by quiz id, after a backup:
--   npx wrangler d1 export practicals --remote --output backup.sql
-- min(id) picks the seeded built-in (the earliest id) if someone later makes a quiz with the same mode, system and name.
-- Rows with no matching quiz keep their key; the app ignores them.

UPDATE history
SET quiz_id = (
  SELECT min(q.id) FROM quizzes q
  WHERE json_extract(q.data, '$.mode') || '|' || json_extract(q.data, '$.system') || '|' || json_extract(q.data, '$.name') = history.quiz_id
)
WHERE EXISTS (
  SELECT 1 FROM quizzes q
  WHERE json_extract(q.data, '$.mode') || '|' || json_extract(q.data, '$.system') || '|' || json_extract(q.data, '$.name') = history.quiz_id
);
