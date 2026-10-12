-- A quiz no longer has a `system`: the group it belongs to is the section of the playlist that lists it.
-- json_remove edits the JSON in place, so `deleted` and the order of the sections (the key order of `items`) are untouched.
-- Only quizzes that still have the key are rewritten, so it can be re-run.

UPDATE quizzes
SET data = json_remove(data, '$.system')
WHERE json_type(data, '$.system') IS NOT NULL;
