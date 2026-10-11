// Recall Drill API. Host-agnostic: built on Hono (Workers, Node, Deno, Bun) with injected pieces.
//   getAuth(c)  -> a Better Auth instance for the request (see auth.js)
//   getStore(c) -> history storage with getHistory(userId) / putHistory(userId, rows) (see d1-store.js)
//   getDb(c)    -> the D1 database, for quizzes and playlists (quizzes.js, playlists.js; they use SQLite JSON functions)
//   limitWrites(c, key) -> Promise<boolean>, optional: false means the caller is writing too fast (429)
// /api/auth/* is Better Auth (Google sign-in, sessions). GET /api/history returns the signed-in user's record
// ({v:1, stars, drills}); PUT replaces it. /api/quizzes and /api/playlists are readable by anyone and writable by
// their owner. /api/settings holds the global settings (readable by anyone, writable by any signed-in user). Everything else
// under /api is 404. The user is always the session's, never a client claim.
import { Hono } from "hono";
import { etag } from "hono/etag";
import { checkRecord, recordToRows, rowsToRecord } from "./history.js";
import { mountPlaylists } from "./playlists.js";
import { mountQuizzes } from "./quizzes.js";
import { mountSettings } from "./settings.js";

const MAX = 256 * 1024;

export function createApp({ getAuth, getStore, getDb, limitWrites }) {
  const app = new Hono();

  // Public reads (quizzes and playlists, not "mine") set `cacheable`: they get an ETag and the browser revalidates every
  // time (a 304 for an unchanged 320 KB playlist). Everything else is never stored.
  app.use("/api/*", async (c, next) => {
    await next();
    c.header("cache-control", c.get("cacheable") ? "no-cache" : "no-store");
  });
  app.use("/api/quizzes", etag());
  app.use("/api/quizzes/:id", etag());
  app.use("/api/playlists", etag());
  app.use("/api/playlists/:id", etag());

  app.on(["GET", "POST"], "/api/auth/*", (c) => getAuth(c).handler(c.req.raw));

  // The session for this request, or null (looked up once per request)
  const getSession = async (c) => {
    let s = c.get("session");
    if (s === undefined) {
      s =
        (await getAuth(c).api.getSession({ headers: c.req.raw.headers })) ??
        null;
      c.set("session", s);
    }
    return s;
  };

  // Cookie auth: refuse cross-origin writes, require a session, and expose the user id
  const auth = async (c, next) => {
    const origin = c.req.header("origin");
    if (
      c.req.method !== "GET" &&
      origin &&
      origin !== new URL(c.req.url).origin
    )
      return c.json({ error: "forbidden" }, 403);
    const session = await getSession(c);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    c.set("userId", session.user.id);
    await next();
  };

  app.get("/api/history", auth, async (c) =>
    c.json(rowsToRecord(await getStore(c).getHistory(c.get("userId")))),
  );

  app.put("/api/history", auth, async (c) => {
    if (limitWrites && !(await limitWrites(c, "history:" + c.get("userId"))))
      return c.json({ error: "too many requests" }, 429);
    const text = await c.req.text();
    if (text.length > MAX) return c.json({ error: "too large" }, 413);
    let record;
    try {
      record = JSON.parse(text);
    } catch {
      return c.json({ error: "bad json" }, 400);
    }
    const bad = checkRecord(record);
    if (bad) return c.json({ error: bad }, 400);
    await getStore(c).putHistory(c.get("userId"), recordToRows(record));
    return c.json({ ok: true });
  });

  const deps = { getDb, getSession, auth, limitWrites };
  mountQuizzes(app, deps);
  mountPlaylists(app, deps);
  mountSettings(app, deps);

  app.all("/api/*", (c) => c.json({ error: "not found" }, 404));

  return app;
}
