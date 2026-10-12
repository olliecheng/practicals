// Links from before drills were stored as quizzes: /p/cond, /p/pres, /p/sys (playlists) and /q/<base64 of "<system>.<name>"> (drills; only the name is used now).
// FEATURED are the built-in playlists seeded by migrations/0003_seed_builtin.sql, in the order Home shows them.
export const FEATURED = [
  { slug: "cond", id: "01a0f4c4-0c20-72e6-9bc1-f16f3c032604" },
  { slug: "pres", id: "01a0f4c5-40b8-74d6-ba30-518e7deafe12" },
  { slug: "sys", id: "01a0f4c5-aa30-77d7-bd6c-1afed312b051" },
];

export const featuredId = (slug) => FEATURED.find((f) => f.slug === slug)?.id;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isQuizId = (s) => UUID.test(s);

export const drillPath = (id) => `/q/${id}`;
export const playlistPath = (id) => `/p/${id}`;

const fromB64url = (s) => {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b + "=".repeat((4 - (b.length % 4)) % 4));
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(bin, (c) => c.charCodeAt(0)),
  );
};

// The old drill URL segment -> {name}, or null if it isn't one. The system in front of the first full stop is dropped: quizzes no longer have one.
export function decodeLegacyDrill(id) {
  let text;
  try {
    text = fromB64url(id);
  } catch {
    return null;
  }
  const dot = text.indexOf(".");
  if (dot < 0) return null;
  return { name: text.slice(dot + 1) };
}
