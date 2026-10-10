// Helpers shared by the quiz and playlist routes (D1 / SQLite).

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
  json_extract(q.data, '$.mode') AS mode, json_extract(q.data, '$.system') AS system,
  json_extract(q.data, '$.name') AS name, json_extract(q.data, '$.prompt') AS prompt,
  json_extract(q.data, '$.deleted') AS deleted, ${OWNER_COLS}`;
export const quizMeta = (r) => ({
  id: r.id,
  owner: owner(r),
  forked_from: r.forked_from,
  mode: r.mode,
  system: r.system,
  name: r.name,
  prompt: r.prompt,
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

// Section keys of a quiz's data per mode (the same as SECTION_KEYS in src/recall-drill/lib/data.js)
const QUIZ_SECTIONS = {
  cond: [
    "presentation",
    "risks",
    "examination",
    "investigations",
    "medications",
  ],
  pres: ["differentials", "associated", "investigations"],
  sys: ["symptoms"],
};
const validItems = (list) =>
  Array.isArray(list) &&
  list.every(
    (it) =>
      it && typeof it.label === "string" && typeof it.keywords === "string",
  );
// A section is a list of items or {"Category": [items]}; a missing one counts as empty
const validSection = (sec) =>
  sec === undefined ||
  validItems(sec) ||
  (!!sec &&
    typeof sec === "object" &&
    !Array.isArray(sec) &&
    Object.values(sec).every(validItems));

// True if a quiz body has the shape the app reads (any signed-in user can now PUT a quiz, so it is checked)
export const validQuiz = (b) =>
  !!QUIZ_SECTIONS[b.mode] &&
  typeof b.system === "string" &&
  typeof b.name === "string" &&
  !!b.name &&
  !b.name.includes(".") &&
  typeof b.prompt === "string" &&
  QUIZ_SECTIONS[b.mode].every((k) => validSection(b[k]));
