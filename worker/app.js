// Recall Drill accounts API. Host-agnostic: built on Hono (Workers, Node, Deno, Bun) and a tiny storage interface.
//   store.get(name)        -> JSON string | null
//   store.put(name, text)  -> void
// GET /api/user returns the blob (404 if the user doesn't exist); PUT replaces it (and creates the user).
import { Hono } from "hono";

const NAME = /^[a-z0-9_-]{1,100}$/;
const MAX = 256 * 1024;

// getStore(c) resolves the storage for a request (on Cloudflare: from c.env).
export function createApp(getStore) {
  const app = new Hono();

  app.use("/api/*", async (c, next) => {
    await next();
    c.header("cache-control", "no-store");
  });

  app.all("/api/user", async (c) => {
    const name = (c.req.header("x-username") || "").trim().toLowerCase();
    if (!NAME.test(name)) return c.json({ error: "bad username" }, 400);
    const store = getStore(c);

    if (c.req.method === "GET") {
      const data = await store.get(name);
      if (data == null) return c.json({ error: "not found" }, 404);
      return c.body(data, 200, { "content-type": "application/json" });
    }

    if (c.req.method === "PUT") {
      const text = await c.req.text();
      if (text.length > MAX) return c.json({ error: "too large" }, 413);
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return c.json({ error: "bad json" }, 400);
      }
      if (!data || data.v !== 1) return c.json({ error: "bad data" }, 400);
      await store.put(name, text);
      return c.json({ ok: true });
    }

    return c.json({ error: "method not allowed" }, 405);
  });

  app.all("/api/*", (c) => c.json({ error: "not found" }, 404));

  return app;
}
