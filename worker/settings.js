// Global settings routes: {agentQuizPrompt, categories}, shared by every user. Anyone can read; any signed-in user can change
// them (like quizzes and playlists). A key with no stored row falls back to its default.
import vocab from "../src/recall-drill/categories.json";
import { readObject } from "./content-util.js";

const MAX_PROMPT = 20000;
const MAX_CATEGORIES = 200;
const MAX_NAME = 100;

// The category vocabulary the quizzes were seeded with, each name once (the file lists them per mode and section)
const DEFAULT_CATEGORIES = [
  ...new Set(
    Object.values(vocab).flatMap((sections) =>
      Object.values(sections).flatMap((list) => list.map((c) => c.name)),
    ),
  ),
];

const DEFAULTS = { agentQuizPrompt: "", categories: DEFAULT_CATEGORIES };

// One validator per key; a body key without one is rejected
const VALID = {
  agentQuizPrompt: (v) => typeof v === "string" && v.length <= MAX_PROMPT,
  categories: (v) =>
    Array.isArray(v) &&
    v.length <= MAX_CATEGORIES &&
    v.every(
      (n) =>
        typeof n === "string" && n === n.trim() && n && n.length <= MAX_NAME,
    ) &&
    new Set(v.map((n) => n.toLowerCase())).size === v.length,
};

async function readSettings(db) {
  const { results } = await db.prepare("SELECT key, data FROM settings").all();
  const out = { ...DEFAULTS };
  for (const { key, data } of results)
    if (key in VALID) out[key] = JSON.parse(data);
  return out;
}

export function mountSettings(app, { getDb, auth, limitWrites }) {
  app.get("/api/settings", async (c) => c.json(await readSettings(getDb(c))));

  // Body: any of the keys above; only those sent are replaced. Returns all the settings.
  app.put("/api/settings", auth, async (c) => {
    if (limitWrites && !(await limitWrites(c, "settings:" + c.get("userId"))))
      return c.json({ error: "too many requests" }, 429);
    const body = await readObject(c);
    const keys = body && Object.keys(body);
    if (!keys?.length || !keys.every((k) => k in VALID && VALID[k](body[k])))
      return c.json({ error: "bad settings" }, 400);
    const db = getDb(c);
    await db.batch(
      keys.map((k) =>
        db
          .prepare(
            "INSERT INTO settings (key, data) VALUES (?1, ?2) ON CONFLICT (key) DO UPDATE SET data = excluded.data",
          )
          .bind(k, JSON.stringify(body[k])),
      ),
    );
    return c.json(await readSettings(db));
  });
}
