// Recall Drill API. Host-agnostic: built on Hono (Workers, Node, Deno, Bun) with two injected pieces.
//   getAuth(c)  -> a Better Auth instance for the request (see auth.js)
//   getStore(c) -> storage with getHistory(userId) / putHistory(userId, rows) (see d1-store.js)
//   limitWrites(c, key) -> Promise<boolean>, optional: false means the caller is writing too fast (429)
// /api/auth/* is Better Auth (Google sign-in, sessions). GET /api/history returns the signed-in user's record
// ({v:1, stars, drills}); PUT replaces it. Everything else under /api is 404. The user is always the session's, never a client claim.
import { Hono } from "hono";
import { checkRecord, recordToRows, rowsToRecord } from "./history.js";

const MAX = 256 * 1024;

export function createApp({ getAuth, getStore, limitWrites }) {
  const app = new Hono();

  app.use("/api/*", async (c, next) => {
    await next();
    c.header("cache-control", "no-store");
  });

  app.on(["GET", "POST"], "/api/auth/*", (c) => getAuth(c).handler(c.req.raw));

  app.use("/api/history", async (c, next) => {
    // Cookie auth: refuse cross-origin writes
    const origin = c.req.header("origin");
    if (
      c.req.method !== "GET" &&
      origin &&
      origin !== new URL(c.req.url).origin
    )
      return c.json({ error: "forbidden" }, 403);
    const session = await getAuth(c).api.getSession({
      headers: c.req.raw.headers,
    });
    if (!session) return c.json({ error: "unauthorized" }, 401);
    c.set("userId", session.user.id);
    await next();
  });

  app.get("/api/history", async (c) =>
    c.json(rowsToRecord(await getStore(c).getHistory(c.get("userId")))),
  );

  app.put("/api/history", async (c) => {
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

  app.all("/api/*", (c) => c.json({ error: "not found" }, 404));

  return app;
}
