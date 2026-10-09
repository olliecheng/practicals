// Playlist routes. A playlist's `data` is {title, description, sections:[{title, quiz_ids:[quizId]}]}; quizzes are referenced by id,
// so an owner's edit to a quiz shows in every playlist that uses it. Anyone can read; only the owner changes a playlist.
import { v7 } from "uuid";
import {
  OWNER_COLS,
  QUIZ_META_COLS,
  getQuiz,
  isId,
  owner,
  page,
  pageParams,
  quizFull,
  quizMeta,
  readObject,
} from "./content-util.js";

const arr = (x) => (Array.isArray(x) ? x : []);

export function mountPlaylists(app, { getDb, getSession, auth }) {
  const PLAYLIST = `SELECT p.id, p.owner_id, p.forked_from, p.data, ${OWNER_COLS} FROM playlists p LEFT JOIN users u ON u.id = p.owner_id`;
  const getPlaylist = async (db, id) => {
    const r = await db
      .prepare(PLAYLIST + " WHERE p.id = ?")
      .bind(id)
      .first();
    return r && { ...r, data: JSON.parse(r.data) };
  };
  const notFound = (c) => c.json({ error: "not found" }, 404);

  // Playlist summaries, newest first. ?owner=me (needs a session) or ?owner=<id>.
  app.get("/api/playlists", async (c) => {
    let ownerId = null;
    const o = c.req.query("owner");
    if (o === "me") {
      const s = await getSession(c);
      if (!s) return c.json({ error: "unauthorized" }, 401);
      ownerId = s.user.id;
    } else if (o) ownerId = o;
    const { before, limit } = pageParams(c);
    if (before === false) return c.json({ error: "bad cursor" }, 400);
    const { results } = await getDb(c)
      .prepare(
        `SELECT p.id, p.owner_id, p.forked_from,
                json_extract(p.data, '$.title') AS title, json_extract(p.data, '$.description') AS description,
                json_array_length(p.data, '$.sections') AS section_count, ${OWNER_COLS}
         FROM playlists p LEFT JOIN users u ON u.id = p.owner_id
         WHERE (?1 IS NULL OR p.owner_id = ?1) AND (?2 IS NULL OR p.id < ?2)
         ORDER BY p.id DESC LIMIT ?3`,
      )
      .bind(ownerId, before, limit)
      .all();
    return c.json(
      page(
        results.map((r) => ({
          id: r.id,
          owner: owner(r),
          forked_from: r.forked_from,
          title: r.title,
          description: r.description,
          sectionCount: r.section_count || 0,
        })),
        limit,
      ),
    );
  });

  // The playlist with its quizzes grouped by section, in order. ?quizzes=meta leaves the quiz bodies out.
  // Deleted quizzes are included with their flag; the client decides what to do with them.
  app.get("/api/playlists/:id", async (c) => {
    const id = c.req.param("id");
    if (!isId(id)) return notFound(c);
    const db = getDb(c);
    const pl = await getPlaylist(db, id);
    if (!pl) return notFound(c);
    const sections = arr(pl.data.sections);
    const ids = [
      ...new Set(
        sections.flatMap((s) => arr(s?.quiz_ids)).filter((x) => isId(x)),
      ),
    ];
    const meta = c.req.query("quizzes") === "meta";
    const byId = new Map();
    if (ids.length) {
      const { results } = await db
        .prepare(
          meta
            ? `SELECT ${QUIZ_META_COLS} FROM quizzes q LEFT JOIN users u ON u.id = q.owner_id WHERE q.id IN (SELECT value FROM json_each(?1))`
            : `SELECT q.id, q.owner_id, q.forked_from, q.data, ${OWNER_COLS} FROM quizzes q LEFT JOIN users u ON u.id = q.owner_id WHERE q.id IN (SELECT value FROM json_each(?1))`,
        )
        .bind(JSON.stringify(ids))
        .all();
      for (const r of results) byId.set(r.id, meta ? quizMeta(r) : quizFull(r));
    }
    return c.json({
      id: pl.id,
      owner: owner(pl),
      forked_from: pl.forked_from,
      title: pl.data.title,
      description: pl.data.description,
      sections: sections.map((s) => ({
        title: s?.title,
        quizzes: arr(s?.quiz_ids)
          .map((q) => byId.get(q))
          .filter(Boolean),
      })),
    });
  });

  // The body is the playlist data
  app.post("/api/playlists", auth, async (c) => {
    const body = await readObject(c);
    if (!body) return c.json({ error: "bad json" }, 400);
    const db = getDb(c);
    const id = v7();
    await db
      .prepare("INSERT INTO playlists (id, owner_id, data) VALUES (?1, ?2, ?3)")
      .bind(id, c.get("userId"), JSON.stringify(body))
      .run();
    return c.json({ id, data: body }, 201);
  });

  app.put("/api/playlists/:id", auth, async (c) => {
    const id = c.req.param("id");
    if (!isId(id)) return notFound(c);
    const body = await readObject(c);
    if (!body) return c.json({ error: "bad json" }, 400);
    const r = await getDb(c)
      .prepare("UPDATE playlists SET data = ?1 WHERE id = ?2 AND owner_id = ?3")
      .bind(JSON.stringify(body), id, c.get("userId"))
      .run();
    return r.meta.changes ? c.json({ id, data: body }) : notFound(c);
  });

  // Hard delete; quizzes are untouched
  app.delete("/api/playlists/:id", auth, async (c) => {
    const id = c.req.param("id");
    if (!isId(id)) return notFound(c);
    const r = await getDb(c)
      .prepare("DELETE FROM playlists WHERE id = ?1 AND owner_id = ?2")
      .bind(id, c.get("userId"))
      .run();
    return r.meta.changes ? c.json({ ok: true }) : notFound(c);
  });

  // Same sections and quiz ids, owned by the caller; the quizzes themselves are not copied
  app.post("/api/playlists/:id/copy", auth, async (c) => {
    const id = c.req.param("id");
    if (!isId(id)) return notFound(c);
    const db = getDb(c);
    const copyId = v7();
    const r = await db
      .prepare(
        "INSERT INTO playlists (id, owner_id, forked_from, data) SELECT ?1, ?2, p.id, p.data FROM playlists p WHERE p.id = ?3",
      )
      .bind(copyId, c.get("userId"), id)
      .run();
    if (!r.meta.changes) return notFound(c);
    const pl = await getPlaylist(db, copyId);
    return c.json({ id: copyId, forked_from: id, data: pl.data }, 201);
  });

  // Fork a quiz and swap the fork into the caller's own playlist at the same place. One batch: the copy is only inserted
  // if the caller owns the playlist, and the playlist is only updated if the copy exists, so neither half can happen alone.
  app.post("/api/playlists/:pid/quizzes/:qid/fork", auth, async (c) => {
    const { pid, qid } = c.req.param();
    if (!isId(pid) || !isId(qid)) return notFound(c);
    const db = getDb(c);
    const me = c.get("userId");
    const row = await db
      .prepare("SELECT data FROM playlists WHERE id = ?1 AND owner_id = ?2")
      .bind(pid, me)
      .first();
    if (!row) return notFound(c);
    const data = JSON.parse(row.data);
    const forkId = v7();
    let found = false;
    const sections = arr(data.sections).map((s) => {
      if (!arr(s?.quiz_ids).includes(qid)) return s;
      found = true;
      return {
        ...s,
        quiz_ids: s.quiz_ids.map((x) => (x === qid ? forkId : x)),
      };
    });
    if (!found) return notFound(c);
    const [ins] = await db.batch([
      db
        .prepare(
          `INSERT INTO quizzes (id, owner_id, forked_from, data)
           SELECT ?1, ?2, q.id, json_set(q.data, '$.deleted', json('false')) FROM quizzes q
           WHERE q.id = ?3 AND EXISTS (SELECT 1 FROM playlists WHERE id = ?4 AND owner_id = ?2)`,
        )
        .bind(forkId, me, qid, pid),
      db
        .prepare(
          `UPDATE playlists SET data = ?1
           WHERE id = ?2 AND owner_id = ?3 AND EXISTS (SELECT 1 FROM quizzes WHERE id = ?4)`,
        )
        .bind(JSON.stringify({ ...data, sections }), pid, me, forkId),
    ]);
    if (!ins.meta.changes) return notFound(c);
    return c.json(await getQuiz(db, forkId), 201);
  });
}
