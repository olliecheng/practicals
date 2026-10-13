// Autosave of a round in progress, one row per signed-in user per quiz (table quiz_progress). The snapshot is the client's
// (item labels in string arrays); it is checked for shape and size only. `updated` is when it was saved (epoch ms).
//   GET    /api/progress           -> {items: {quizId: {updated, got, total}}}  (no snapshots)
//   GET    /api/progress/:quizId   -> {updated, data}, or 404
//   PUT    /api/progress/:quizId   -> {ok:true}; replaces the snapshot
//   DELETE /api/progress/:quizId   -> {ok:true}

const MAX_BODY = 64 * 1024;
const MAX_ID = 100;
const LISTS = ["found", "credited", "revealed", "ignored"];

const strings = (v) =>
  Array.isArray(v) && v.every((x) => typeof x === "string");
const count = (v) => Number.isInteger(v) && v >= 0;

// A message for the first problem, or null
export function checkProgress(d) {
  if (!d || d.v !== 1) return "bad snapshot";
  if (!LISTS.every((k) => strings(d[k]))) return "bad lists";
  if (!count(d.got) || !count(d.total)) return "bad counts";
  if (typeof d.redo !== "boolean") return "bad redo";
  if (typeof d.active !== "string") return "bad names";
  return null;
}

export function mountProgress(app, { getDb, auth, limitWrites }) {
  const okId = (id) => id.length > 0 && id.length <= MAX_ID;

  app.get("/api/progress", auth, async (c) => {
    const { results } = await getDb(c)
      .prepare(
        "SELECT quiz_id, updated, json_extract(data, '$.got') AS got, json_extract(data, '$.total') AS total FROM quiz_progress WHERE user_id = ?",
      )
      .bind(c.get("userId"))
      .all();
    const items = {};
    for (const r of results)
      items[r.quiz_id] = { updated: r.updated, got: r.got, total: r.total };
    return c.json({ items });
  });

  app.get("/api/progress/:id", auth, async (c) => {
    const r = await getDb(c)
      .prepare(
        "SELECT data, updated FROM quiz_progress WHERE user_id = ? AND quiz_id = ?",
      )
      .bind(c.get("userId"), c.req.param("id"))
      .first();
    if (!r) return c.json({ error: "not found" }, 404);
    return c.json({ updated: r.updated, data: JSON.parse(r.data) });
  });

  app.put("/api/progress/:id", auth, async (c) => {
    const id = c.req.param("id");
    if (!okId(id)) return c.json({ error: "bad id" }, 400);
    if (limitWrites && !(await limitWrites(c, "progress:" + c.get("userId"))))
      return c.json({ error: "too many requests" }, 429);
    const text = await c.req.text();
    if (text.length > MAX_BODY) return c.json({ error: "too large" }, 413);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return c.json({ error: "bad json" }, 400);
    }
    const bad = checkProgress(data);
    if (bad) return c.json({ error: bad }, 400);
    await getDb(c)
      .prepare(
        `INSERT INTO quiz_progress (user_id, quiz_id, data, updated) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (user_id, quiz_id) DO UPDATE SET data = excluded.data, updated = excluded.updated`,
      )
      .bind(c.get("userId"), id, JSON.stringify(data), Date.now())
      .run();
    return c.json({ ok: true });
  });

  app.delete("/api/progress/:id", auth, async (c) => {
    await getDb(c)
      .prepare("DELETE FROM quiz_progress WHERE user_id = ? AND quiz_id = ?")
      .bind(c.get("userId"), c.req.param("id"))
      .run();
    return c.json({ ok: true });
  });
}
