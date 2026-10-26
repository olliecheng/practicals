// Quiz routes. A quiz's `data` is the drill (name, items: the sections); `deleted` is a column.
// Anyone can read; only approved editors (permissions.js) can create, edit, soft-delete, restore or fork a quiz (0 changes means 404).
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
  quizSummary,
  readObject,
  validateQuiz,
} from "./content-util.js";

export function mountQuizzes(app, { getDb, getSession, editor }) {
  // List quiz summaries, newest first. ?owner=me (needs a session) or ?owner=<id>; deleted quizzes are hidden unless
  // the caller asks for their own with &deleted=1. More filters: ?ids=<id,id,...> (up to 100), ?name=
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
        `SELECT ${full ? `q.id, q.owner_id, q.forked_from, q.deleted, q.data, ${OWNER_COLS}` : QUIZ_META_COLS}
         FROM quizzes q LEFT JOIN users u ON u.id = q.owner_id
         WHERE (?1 IS NULL OR q.owner_id = ?1)
           AND (?2 = 1 OR q.deleted = 0)
           AND (?3 IS NULL OR q.id < ?3)
           AND (?5 IS NULL OR q.id IN (SELECT value FROM json_each(?5)))
           AND (?6 IS NULL OR json_extract(q.data, '$.name') = ?6)
         ORDER BY q.id DESC LIMIT ?4`,
      )
      .bind(
        ownerId,
        withDeleted,
        before,
        limit,
        ids,
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
  app.post("/api/quizzes", editor, async (c) => {
    const body = await readObject(c);
    if (!body) return c.json({ error: "bad json" }, 400);
    const db = getDb(c);
    const id = v7();
    // A new quiz is never deleted: the column defaults to 0, so a `deleted` key in the body is dropped, not stored
    const { deleted: _deleted, ...data } = body;
    await db
      .prepare("INSERT INTO quizzes (id, owner_id, data) VALUES (?1, ?2, ?3)")
      .bind(id, c.get("userId"), JSON.stringify(data))
      .run();
    return c.json(await getQuiz(db, id), 201);
  });

  // Checks a quiz body without saving it (the editor's Validate button): {ok: true, summary} or {ok: false, errors}.
  // Always 200: an invalid quiz is a normal answer here. PUT runs the same check.
  app.post("/api/quizzes/validate", editor, async (c) => {
    const body = await readObject(c);
    if (!body) return c.json({ error: "bad json" }, 400);
    const errors = validateQuiz(body);
    return c.json(
      errors.length
        ? { ok: false, errors }
        : { ok: true, summary: quizSummary(body) },
    );
  });

  // Replaces the data in place (any signed-in user may): every playlist that references the quiz sees the change. The `deleted` column is not touched.
  app.put("/api/quizzes/:id", editor, async (c) => {
    const id = c.req.param("id");
    if (!isId(id)) return c.json({ error: "not found" }, 404);
    const body = await readObject(c);
    if (!body) return c.json({ error: "bad json" }, 400);
    const db = getDb(c);
    const errors = validateQuiz(body);
    if (errors.length) return c.json({ error: errors.join("\n"), errors }, 400);
    const r = await db
      .prepare("UPDATE quizzes SET data = ?1 WHERE id = ?2")
      .bind(JSON.stringify(body), id)
      .run();
    if (!r.meta.changes) return c.json({ error: "not found" }, 404);
    return c.json(await getQuiz(db, id));
  });

  // Soft delete / restore (any signed-in user may, like editing). Playlists are never touched, so restoring puts the quiz back everywhere.
  app.put("/api/quizzes/:id/deleted", editor, async (c) => {
    const id = c.req.param("id");
    if (!isId(id)) return c.json({ error: "not found" }, 404);
    const body = await readObject(c);
    if (!body || typeof body.deleted !== "boolean")
      return c.json({ error: "bad json" }, 400);
    const r = await getDb(c)
      .prepare("UPDATE quizzes SET deleted = ?1 WHERE id = ?2")
      .bind(body.deleted ? 1 : 0, id)
      .run();
    return r.meta.changes
      ? c.json({ ok: true })
      : c.json({ error: "not found" }, 404);
  });

  // Copy of anyone's quiz (deleted or not) owned by the caller, not deleted
  app.post("/api/quizzes/:id/fork", editor, async (c) => {
    const id = c.req.param("id");
    if (!isId(id)) return c.json({ error: "not found" }, 404);
    const db = getDb(c);
    const forkId = v7();
    const r = await db
      .prepare(
        `INSERT INTO quizzes (id, owner_id, forked_from, data)
         SELECT ?1, ?2, q.id, q.data FROM quizzes q WHERE q.id = ?3`,
      )
      .bind(forkId, c.get("userId"), id)
      .run();
    if (!r.meta.changes) return c.json({ error: "not found" }, 404);
    return c.json(await getQuiz(db, forkId), 201);
  });
}
