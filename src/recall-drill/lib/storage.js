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
