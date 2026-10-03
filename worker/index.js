// Recall Drill accounts: one JSON blob per username in the D1 `users` table.
// Only /api/* reaches this Worker (see run_worker_first in wrangler.jsonc); everything else is static assets.
// GET /api/user returns the blob (404 if the user doesn't exist); PUT replaces it (and creates the user).
const NAME = /^[a-z0-9_-]{1,100}$/;
const MAX = 256 * 1024;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });

// Created on first use, so there is no migration step to run.
let ready;
const init = (db) =>
  (ready ??= db
    .prepare(
      "CREATE TABLE IF NOT EXISTS users (name TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL)",
    )
    .run()
    .catch((e) => {
      ready = undefined;
      throw e;
    }));

async function user(request, env) {
  const name = (request.headers.get("x-username") || "").trim().toLowerCase();
  if (!NAME.test(name)) return json({ error: "bad username" }, 400);
  await init(env.DB);

  if (request.method === "GET") {
    const row = await env.DB.prepare("SELECT data FROM users WHERE name = ?")
      .bind(name)
      .first();
    if (!row) return json({ error: "not found" }, 404);
    return new Response(row.data, {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }

  if (request.method === "PUT") {
    const text = await request.text();
    if (text.length > MAX) return json({ error: "too large" }, 413);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return json({ error: "bad json" }, 400);
    }
    if (!data || data.v !== 1) return json({ error: "bad data" }, 400);
    await env.DB.prepare(
      "INSERT INTO users (name, data, updated) VALUES (?1, ?2, ?3) ON CONFLICT(name) DO UPDATE SET data = excluded.data, updated = excluded.updated",
    )
      .bind(name, text, Date.now())
      .run();
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/user") return user(request, env);
    return json({ error: "not found" }, 404);
  },
};
