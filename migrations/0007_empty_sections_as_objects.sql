-- A section is an object of {"Category": [items]}. Twelve built-in quizzes stored an empty section as `[]`, which the quiz validator rejects.
-- Rewrite every empty array under `items` as `{}`; json_each yields the sections in document order and json_group_object keeps it.
-- Sections that are non-empty arrays (there are none) are left alone, and quizzes without an array section are not touched, so it can be re-run.

UPDATE quizzes
SET data = json_set(data, '$.items', json((
  SELECT json_group_object(
    key,
    json(CASE WHEN type = 'array' AND json_array_length(value) = 0 THEN '{}' ELSE value END)
  )
  FROM json_each(quizzes.data, '$.items')
)))
WHERE EXISTS (
  SELECT 1 FROM json_each(quizzes.data, '$.items') WHERE type = 'array' AND json_array_length(value) = 0
);
