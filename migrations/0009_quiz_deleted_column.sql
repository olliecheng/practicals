-- A quiz's soft-delete flag moves from `data.$.deleted` (JSON, set with json_set) to a `deleted` column (0 or 1).
-- Existing flags are carried over, then the key is removed from `data`, so a quiz's data is just {name, items}.
-- Re-runnable apart from the ALTER: the UPDATEs only touch rows that still have the key.

ALTER TABLE quizzes ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1));

UPDATE quizzes
SET deleted = COALESCE(json_extract(data, '$.deleted'), 0)
WHERE json_type(data, '$.deleted') IS NOT NULL;

UPDATE quizzes
SET data = json_remove(data, '$.deleted')
WHERE json_type(data, '$.deleted') IS NOT NULL;
