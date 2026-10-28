// The signed-in user's record lives behind /api/history (see worker/app.js); the session is a cookie set by Better Auth.
const HINT = "recallDrillSignedIn";
const CKEY = "recallDrillCollapsed";

// Remembered across loads so the drill route can wait for the saved record only when one is expected
export const expectSignedIn = () => {
  try {
    return localStorage.getItem(HINT) === "1";
  } catch {
    return false;
  }
};

export const setSignedInHint = (v) => {
  try {
    v ? localStorage.setItem(HINT, "1") : localStorage.removeItem(HINT);
  } catch {}
};

export const loadCollapsed = () => {
  try {
    return localStorage.getItem(CKEY) === "1";
  } catch {
    return false;
  }
};
export const saveCollapsed = (v) => {
  try {
    localStorage.setItem(CKEY, v ? "1" : "0");
  } catch {}
};

// A quiz's record keeps every attempt (attempts: [{t, score, found, credited}], oldest first, newest MAX_ATTEMPTS kept); the top-level
// runs / last / score / found / credited mirror the latest one, which is what the quiz list, Redo incorrect and the home counter read.
// Call this after any change to `attempts`.
export const MAX_ATTEMPTS = 30;
export function syncLatest(r) {
  if (r.attempts.length > MAX_ATTEMPTS)
    r.attempts.splice(0, r.attempts.length - MAX_ATTEMPTS);
  const a = r.attempts[r.attempts.length - 1];
  r.runs = r.attempts.length;
  r.last = a ? a.t : 0;
  r.score = a ? a.score : 0;
  r.found = a ? [...a.found] : [];
  r.credited = a ? [...a.credited] : [];
}

// Resolves to the user record, or null if there is no session. Throws if the server can't be reached.
export async function fetchHistory() {
  const r = await fetch("/api/history", { cache: "no-store" });
  if (r.status === 401) return null;
  if (!r.ok) throw new Error("status " + r.status);
  const u = await r.json();
  if (!u || u.v !== 1) throw new Error("bad data");
  u.stars = u.stars || [];
  u.drills = u.drills || {};
  Object.values(u.drills).forEach((d) => {
    d.found = d.found || [];
    d.credited = d.credited || [];
    d.ignored = d.ignored || [];
    // Records from before attempts were kept: the one saved result becomes the only attempt
    if (!Array.isArray(d.attempts))
      d.attempts = d.runs
        ? [{ t: d.last, score: d.score, found: d.found, credited: d.credited }]
        : [];
  });
  return u;
}

export async function putHistory(body) {
  const r = await fetch("/api/history", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
  });
  if (!r.ok) throw new Error("status " + r.status);
}
