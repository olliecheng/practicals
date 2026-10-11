// Helpers shared by the quiz and playlist routes (D1 / SQLite).
import { rx } from "../src/recall-drill/lib/match.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isId = (s) => typeof s === "string" && UUID.test(s);

// The owner's public profile. Never select email or other account columns.
export const OWNER_COLS =
  "u.name AS owner_name, u.username AS owner_username, u.displayUsername AS owner_display, u.image AS owner_image";
export const owner = (r) => ({
  id: r.owner_id,
  name: r.owner_display || r.owner_username || r.owner_name,
  image: r.owner_image,
});

// Quiz summary without its body, pulled out of the JSON by SQLite
export const QUIZ_META_COLS = `q.id, q.owner_id, q.forked_from,
  json_extract(q.data, '$.system') AS system, json_extract(q.data, '$.name') AS name,
  json_extract(q.data, '$.deleted') AS deleted, ${OWNER_COLS}`;
export const quizMeta = (r) => ({
  id: r.id,
  owner: owner(r),
  forked_from: r.forked_from,
  system: r.system,
  name: r.name,
  deleted: !!r.deleted,
});

const QUIZ_FULL = `SELECT q.id, q.owner_id, q.forked_from, q.data, ${OWNER_COLS} FROM quizzes q LEFT JOIN users u ON u.id = q.owner_id`;
export const quizFull = (r) => ({
  id: r.id,
  owner: owner(r),
  forked_from: r.forked_from,
  data: JSON.parse(r.data),
});
export const getQuiz = async (db, id) => {
  const r = await db
    .prepare(QUIZ_FULL + " WHERE q.id = ?")
    .bind(id)
    .first();
  return r ? quizFull(r) : null;
};

// The request body as a plain JSON object, or null
export const readObject = async (c) => {
  try {
    const b = await c.req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? b : null;
  } catch {
    return null;
  }
};

// ?before=<id>&limit=<n>: ids are UUIDv7, so `id < before` pages newest first. before === false means a bad cursor.
export const pageParams = (c, defaultLimit = 50) => {
  const before = c.req.query("before");
  const limit = Math.min(
    100,
    Math.max(1, parseInt(c.req.query("limit")) || defaultLimit),
  );
  if (before !== undefined && !isId(before)) return { before: false, limit };
  return { before: before ?? null, limit };
};
export const page = (items, limit) => ({
  items,
  next: items.length === limit ? items[items.length - 1].id : null,
});

// The keys a quiz carries: its sections are the keys of `items`; `deleted` is owned by the Worker (it is stripped from the body on save)
const QUIZ_FIELDS = ["system", "name", "items", "deleted"];

// The problems with one section ({"Category": [items]}), as messages. Items are {label, keywords}; keywords must compile as the game compiles them.
const sectionErrors = (key, sec) => {
  if (sec === undefined) return [];
  if (!sec || typeof sec !== "object" || Array.isArray(sec))
    return [`${key}: must be an object of {"Category": [items]}.`];
  const errors = [];
  for (const [cat, list] of Object.entries(sec)) {
    const where = `${key} / ${cat}`;
    if (!Array.isArray(list)) {
      errors.push(`${where}: must be a list of items.`);
      continue;
    }
    list.forEach((it, i) => {
      const n = `${where}, item ${i + 1}`;
      if (!it || typeof it !== "object" || Array.isArray(it))
        return errors.push(`${n}: must be {"label", "keywords"}.`);
      if (typeof it.label !== "string" || !it.label.trim())
        return errors.push(`${n}: needs a label.`);
      if (typeof it.keywords !== "string" || !it.keywords.trim())
        return errors.push(`${n} ("${it.label}"): needs keywords.`);
      try {
        rx(it.keywords);
      } catch {
        errors.push(`${n} ("${it.label}"): the keywords aren't valid.`);
      }
    });
  }
  return errors;
};

// The problems with a quiz body as a list of messages (empty when valid): its shape, keywords that compile and known fields.
// Category names are free-form here (Systems review uses its own); the editor's Agentic tab checks them against Settings itself.
// Any signed-in user can PUT a quiz, so this is the only guard on what is stored.
export function validateQuiz(b) {
  if (!b || typeof b !== "object" || Array.isArray(b))
    return ["The quiz must be a JSON object."];
  const errors = [];
  if (typeof b.system !== "string") errors.push('"system" must be text.');
  if (typeof b.name !== "string" || !b.name.trim())
    errors.push('"name" is required.');
  else if (b.name.includes("."))
    errors.push('"name" can\'t contain a full stop.');
  for (const k of Object.keys(b))
    if (k === "mode" || k === "prompt")
      errors.push(`"${k}" is no longer used; remove it.`);
    else if (!QUIZ_FIELDS.includes(k))
      errors.push(`"${k}" isn't a field of a quiz.`);
  const items = b.items;
  if (!items || typeof items !== "object" || Array.isArray(items))
    return [...errors, '"items" must be an object of sections.'];
  const names = Object.keys(items);
  if (!names.length) errors.push('"items" needs at least one section.');
  for (const k of names) {
    if (!k.trim() || k !== k.trim())
      errors.push(
        `Section name "${k}" can't be empty or start or end with a space.`,
      );
    errors.push(...sectionErrors(k, items[k]));
  }
  return errors;
}

// "12 items in 5 categories", for the editor's Validate button
export function quizSummary(b) {
  let items = 0;
  let cats = 0;
  for (const sec of Object.values(b.items))
    for (const list of Object.values(sec)) {
      cats++;
      items += list.length;
    }
  return `${items} items in ${cats} categories`;
}
