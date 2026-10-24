// Redirect-only Worker bound to the old host (practicals.oyc.id.au): every request is sent on to https://medpunk.oyc.id.au.
// Deployed by hand (`cd redirect-worker && npx wrangler deploy`), separately from the main app.
const NEW_ORIGIN = "https://medpunk.oyc.id.au";

// The minis used to be top-level pages (/<name>.html); they now live at /mini/<name>
const MINIS = new Set([
  "dexamethasone",
  "parathyroid",
  "hepatitis-b",
  "liver-function",
  "bacteria",
  "dermatome-ninja",
]);

export function newPath(pathname) {
  // The app used to live under /recall-drill/ and now lives at the root
  const path = pathname.replace(/^\/recall-drill(?=\/|$)/, "") || "/";
  const mini = path.match(/^\/([a-z-]+?)(?:\.html)?$/);
  if (mini && MINIS.has(mini[1])) return "/mini/" + mini[1];
  return path;
}

export default {
  fetch(request) {
    const url = new URL(request.url);
    return Response.redirect(
      NEW_ORIGIN + newPath(url.pathname) + url.search,
      301,
    );
  },
};
