// Cloudflare Worker entry. Only /api/* and the old /recall-drill/* paths reach it (see run_worker_first in wrangler.jsonc);
// everything else is served straight from the static assets, with index.html (the Recall Drill SPA) for unknown client routes.
import { createApp } from "./app.js";
import { createAuth } from "./auth.js";
import { d1Store } from "./d1-store.js";

const api = createApp({
  getAuth: (c) => createAuth(c.env),
  getStore: (c) => d1Store(c.env.DB),
  getDb: (c) => c.env.DB,
  // The binding may be absent (e.g. a preview config that doesn't repeat it): then don't limit
  limitWrites: async (c, key) =>
    !c.env.WRITE_LIMITER || (await c.env.WRITE_LIMITER.limit({ key })).success,
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return api.fetch(request, env, ctx);

    // The only other paths routed here are the old /recall-drill/* ones: the app now lives at the root
    const path = url.pathname.replace(/^\/recall-drill\/?/, "/");
    return Response.redirect(new URL(path + url.search, url), 301);
  },
};
