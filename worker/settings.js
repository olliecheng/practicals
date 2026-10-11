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

// What the quiz editor's Agentic tab tells an AI assistant, until someone changes it in Settings. It is shown above the valid categories
// and the quiz's current JSON, so it refers to them by those names.
const DEFAULT_PROMPT = `You are editing one quiz for a recall game. The player types answers from memory and each item in the quiz is a tile that flips when the typed text matches its keywords. Change the CURRENT QUIZ below as I ask, and reply with the complete edited quiz as JSON.

Layout. The quiz is one JSON object: "mode", "system", "name" (required, no full stop) and "prompt" (a short line shown under the title; may be empty), then the quiz's sections. Each section is an object of categories, each category a list of items:
\`\`\`json
{
  "mode": "...",
  "system": "...",
  "name": "...",
  "prompt": "...",
  "<section>": { "<Category>": [ { "label": "...", "keywords": "a|b|c" }, ... ], ... }
}
\`\`\`
Keep "mode" and the section names exactly as they are in the current quiz. Items appear in the order given, and categories in the order of their keys. Leave out categories that have no items.

Categories. Use only the categories listed under VALID CATEGORIES below, spelt exactly as listed. Put each item in the single category that fits it best. Don't invent categories.

Labels. A label is the text revealed on the tile and the answer the player is shown. Keep labels short, specific and high-yield. Keep the existing label of an item you aren't changing: items are identified by their section and label, so renaming one clears everyone's saved progress for it.

Keywords. "keywords" is one string of alternatives separated by "|", for example "orthopn|pnd|breathless.*lying". The game credits an item when the typed text matches any alternative.
- Write stems rather than whole words. An alternative of more than 3 characters matches the start of a word, so "orthop" matches "orthopnoea".
- An alternative of 3 characters or fewer matches only a whole word (an optional plural "s" is allowed).
- Start an alternative with "~" to match anywhere in a word, for example "~pril" for drug names ending in -pril.
- "." and ".*" work as in a regular expression ("ex.?smok", "wake.*breath"). Otherwise don't use ( ) [ ] or \\, and never put a literal "|" inside an alternative.
- Add the common synonyms, spellings and abbreviations a clinician would type (oedema and edema, anaemia and anemia).

Principles.
- Every item whose keywords match the typed text is credited, not just the best match. Keep generic single words (pain, fever, swelling) off specific items, or a specific answer will also credit the general tile.
- Where one word could name both a diagnosis and its test (iron, B12, urate), the diagnosis needs a qualifier, for example "iron deficiency".
- Don't duplicate an item in two categories or sections.

Reply. Reply with only the edited quiz as valid JSON, with no commentary and no code fence. It must be the whole quiz, not a fragment.`;

const DEFAULTS = {
  agentQuizPrompt: DEFAULT_PROMPT,
  categories: DEFAULT_CATEGORIES,
};

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

export async function readSettings(db) {
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
