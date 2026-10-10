// Quiz routes. A quiz's `data` is the drill (mode, system, name, prompt, sections) plus `deleted`, which only the Worker sets.
// Anyone can read; only the owner changes a quiz (every write carries `AND owner_id = ?`, and 0 changes means 404).
import { v7 } from "uuid";
import {
  OWNER_COLS,
  QUIZ_META_COLS,
  getQuiz,
  isId,
  page,
  pageParams,
  quizFull,
  quizMeta,
  readObject,
} from "./content-util.js";

export function mountQuizzes(app, { getDb, getSession, auth }) {
  // List quiz summaries, newest first. ?owner=me (needs a session) or ?owner=<id>; deleted quizzes are hidden unless
  // the caller asks for their own with &deleted=1. More filters: ?ids=<id,id,...> (up to 100), ?mode=, ?system=, ?name=
  // (exact), and &full=1 to include each quiz's data instead of just its summary.
  app.get("/api/quizzes", async (c) => {
    let ownerId = null;
    let withDeleted = 0;
    const o = c.req.query("owner");
    const mine = o === "me";
    if (mine) {
      const s = await getSession(c);
      if (!s) return c.json({ error: "unauthorized" }, 401);
      ownerId = s.user.id;
      withDeleted = c.req.query("deleted") === "1" ? 1 : 0;
    } else if (o) ownerId = o;
    let ids = null;
    if (c.req.query("ids") !== undefined) {
      const list = c.req.query("ids").split(",").filter(Boolean);
      if (!list.length || list.length > 100 || !list.every(isId))
        return c.json({ error: "bad ids" }, 400);
      ids = JSON.stringify(list);
    }
    const full = c.req.query("full") === "1";
    const { before, limit } = pageParams(c, ids ? 100 : 50);
    if (before === false) return c.json({ error: "bad cursor" }, 400);
    const { results } = await getDb(c)
      .prepare(
        `SELECT ${full ? `q.id, q.owner_id, q.forked_from, q.data, ${OWNER_COLS}` : QUIZ_META_COLS}
         FROM quizzes q LEFT JOIN users u ON u.id = q.owner_id
         WHERE (?1 IS NULL OR q.owner_id = ?1)
           AND (?2 = 1 OR json_extract(q.data, '$.deleted') IS NOT 1)
           AND (?3 IS NULL OR q.id < ?3)
           AND (?5 IS NULL OR q.id IN (SELECT value FROM json_each(?5)))
           AND (?6 IS NULL OR json_extract(q.data, '$.mode') = ?6)
           AND (?7 IS NULL OR json_extract(q.data, '$.system') = ?7)
           AND (?8 IS NULL OR json_extract(q.data, '$.name') = ?8)
         ORDER BY q.id DESC LIMIT ?4`,
      )
      .bind(
        ownerId,
        withDeleted,
        before,
        limit,
        ids,
        c.req.query("mode") ?? null,
        c.req.query("system") ?? null,
        c.req.query("name") ?? null,
      )
      .all();
    if (!mine) c.set("cacheable", true);
    return c.json(page(results.map(full ? quizFull : quizMeta), limit));
  });

  app.get("/api/quizzes/:id", async (c) => {
    const id = c.req.param("id");
    const quiz = isId(id) && (await getQuiz(getDb(c), id));
    if (!quiz) return c.json({ error: "not found" }, 404);
    c.set("cacheable", true);
    return c.json(quiz);
  });

  // The body is the quiz data
  app.post("/api/quizzes", auth, async (c) => {
    const body = await readObject(c);
    if (!body) return c.json({ error: "bad json" }, 400);
    const db = getDb(c);
    const id = v7();
    await db
      .prepare("INSERT INTO quizzes (id, owner_id, data) VALUES (?1, ?2, ?3)")
      .bind(id, c.get("userId"), JSON.stringify({ ...body, deleted: false }))
      .run();
    return c.json(await getQuiz(db, id), 201);
  });

  // Replaces the data in place: every playlist that references the quiz sees the change. `deleted` is kept as it is.
  app.put("/api/quizzes/:id", auth, async (c) => {
    const id = c.req.param("id");
    if (!isId(id)) return c.json({ error: "not found" }, 404);
    const body = await readObject(c);
    if (!body) return c.json({ error: "bad json" }, 400);
    const db = getDb(c);
    const r = await db
      .prepare(
        `UPDATE quizzes
         SET data = json_set(?1, '$.deleted', json(CASE WHEN json_extract(data, '$.deleted') THEN 'true' ELSE 'false' END))
         WHERE id = ?2 AND owner_id = ?3`,
      )
      .bind(JSON.stringify(body), id, c.get("userId"))
      .run();
    if (!r.meta.changes) return c.json({ error: "not found" }, 404);
    return c.json(await getQuiz(db, id));
  });

  // Soft delete / restore. Playlists are never touched, so restoring puts the quiz back everywhere.
  app.put("/api/quizzes/:id/deleted", auth, async (c) => {
    const id = c.req.param("id");
    if (!isId(id)) return c.json({ error: "not found" }, 404);
    const body = await readObject(c);
    if (!body || typeof body.deleted !== "boolean")
      return c.json({ error: "bad json" }, 400);
    const r = await getDb(c)
      .prepare(
        "UPDATE quizzes SET data = json_set(data, '$.deleted', json(?1)) WHERE id = ?2 AND owner_id = ?3",
      )
      .bind(String(body.deleted), id, c.get("userId"))
      .run();
    return r.meta.changes
      ? c.json({ ok: true })
      : c.json({ error: "not found" }, 404);
  });

  // Copy of anyone's quiz (deleted or not) owned by the caller, not deleted
  app.post("/api/quizzes/:id/fork", auth, async (c) => {
    const id = c.req.param("id");
    if (!isId(id)) return c.json({ error: "not found" }, 404);
    const db = getDb(c);
    const forkId = v7();
    const r = await db
      .prepare(
        `INSERT INTO quizzes (id, owner_id, forked_from, data)
         SELECT ?1, ?2, q.id, json_set(q.data, '$.deleted', json('false')) FROM quizzes q WHERE q.id = ?3`,
      )
      .bind(forkId, c.get("userId"), id)
      .run();
    if (!r.meta.changes) return c.json({ error: "not found" }, 404);
    return c.json(await getQuiz(db, forkId), 201);
  });
}
