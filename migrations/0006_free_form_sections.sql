-- Quizzes lose `mode` and `prompt`; their sections move into `items`, keyed by the section's display text (free-form, shown with the
-- first letter capitalised). History items are keyed by label alone (`found`, `credited` and `ignored` lose their `X:` section prefix).
-- Apply it in the same release as the client that reads `items`, after a backup:
--   npx wrangler d1 export practicals --remote --output backup.sql
-- A section the quiz didn't have is NULL in json_object, which json_patch (RFC 7396) drops, so it doesn't appear in `items`.
-- json_patch adds the keys in the order given, which is the section order.

UPDATE quizzes
SET data = json_set(
  json_remove(data, '$.mode', '$.prompt', '$.presentation', '$.risks', '$.examination', '$.investigations', '$.medications'),
  '$.items',
  json_patch('{}', json_object(
    'presentation', json_extract(data, '$.presentation'),
    'risk factors / etiology', json_extract(data, '$.risks'),
    'examination findings', json_extract(data, '$.examination'),
    'investigations', json_extract(data, '$.investigations'),
    'medications, treatment, and management', json_extract(data, '$.medications')
  ))
)
WHERE json_extract(data, '$.mode') = 'cond';

UPDATE quizzes
SET data = json_set(
  json_remove(data, '$.mode', '$.prompt', '$.differentials', '$.associated', '$.investigations'),
  '$.items',
  json_patch('{}', json_object(
    'differentials', json_extract(data, '$.differentials'),
    'associated features (history)', json_extract(data, '$.associated'),
    'investigations', json_extract(data, '$.investigations')
  ))
)
WHERE json_extract(data, '$.mode') = 'pres';

UPDATE quizzes
SET data = json_set(
  json_remove(data, '$.mode', '$.prompt', '$.symptoms'),
  '$.items',
  json_patch('{}', json_object(
    'symptoms to ask about', json_extract(data, '$.symptoms')
  ))
)
WHERE json_extract(data, '$.mode') = 'sys';

-- History: strip the one-letter section code ("P:Fatigue" -> "Fatigue"); values without a code are left alone, so it can be re-run.
UPDATE history
SET data = json_set(data, '$.found', json((
  SELECT json_group_array(label) FROM (
    SELECT DISTINCT CASE WHEN value GLOB '[A-Z]:*' THEN substr(value, 3) ELSE value END AS label
    FROM json_each(json_extract(history.data, '$.found'))
  )
)))
WHERE json_type(data, '$.found') = 'array';

UPDATE history
SET data = json_set(data, '$.credited', json((
  SELECT json_group_array(label) FROM (
    SELECT DISTINCT CASE WHEN value GLOB '[A-Z]:*' THEN substr(value, 3) ELSE value END AS label
    FROM json_each(json_extract(history.data, '$.credited'))
  )
)))
WHERE json_type(data, '$.credited') = 'array';

UPDATE history
SET data = json_set(data, '$.ignored', json((
  SELECT json_group_array(label) FROM (
    SELECT DISTINCT CASE WHEN value GLOB '[A-Z]:*' THEN substr(value, 3) ELSE value END AS label
    FROM json_each(json_extract(history.data, '$.ignored'))
  )
)))
WHERE json_type(data, '$.ignored') = 'array';
