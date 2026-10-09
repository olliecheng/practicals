// Cloudflare Worker entry. Only /api/* and /recall-drill/* reach it (see run_worker_first in wrangler.jsonc);
// everything else is served straight from the static assets.
import { createApp } from "./app.js";
import { createAuth } from "./auth.js";
import { d1Store } from "./d1-store.js";

const api = createApp({
  getAuth: (c) => createAuth(c.env),
  getStore: (c) => d1Store(c.env.DB),
  // The binding may be absent (e.g. a preview config that doesn't repeat it): then don't limit
  limitWrites: async (c, key) =>
    !c.env.WRITE_LIMITER || (await c.env.WRITE_LIMITER.limit({ key })).success,
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return api.fetch(request, env, ctx);

    // Recall Drill is a client-routed SPA: a real file is served as is, any other path gets the app shell.
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 404) return res;
    if (request.method !== "GET" && request.method !== "HEAD") return res;
    return env.ASSETS.fetch(
      new Request(new URL("/recall-drill/", url), request),
    );
  },
};
