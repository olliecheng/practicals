// Recall Drill accounts: one JSON blob per username in the USERS KV namespace.
// GET returns the blob (404 if the user doesn't exist); PUT replaces it (and creates the user).
const NAME = /^[a-z0-9_-]{3,32}$/;
const MAX = 256 * 1024;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });

export async function onRequest({ request, env }) {
  const name = (request.headers.get("x-username") || "").trim().toLowerCase();
  if (!NAME.test(name)) return json({ error: "bad username" }, 400);
  const key = "user:" + name;

  if (request.method === "GET") {
    const blob = await env.USERS.get(key);
    if (blob === null) return json({ error: "not found" }, 404);
    return new Response(blob, {
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
    await env.USERS.put(key, text);
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
}
