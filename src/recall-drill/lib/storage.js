// Username-only accounts: the whole user record is one JSON blob behind /api/user (see worker/app.js).
const KEY = "recallDrillUser";
const CKEY = "recallDrillCollapsed";

export const blankUser = () => ({ v: 1, stars: [], drills: {} });

export const lastUser = () => {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
};

export const rememberUser = (name) => {
  try {
    name ? localStorage.setItem(KEY, name) : localStorage.removeItem(KEY);
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

// Resolves to the user record, or null if the user doesn't exist. Throws if the server can't be reached.
export async function fetchUser(name) {
  const r = await fetch("/api/user", {
    headers: { "x-username": name },
    cache: "no-store",
  });
  if (r.status === 404) {
    const j = await r.json().catch(() => null);
    if (j && j.error === "not found") return null;
    throw new Error("bad response");
  }
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

export async function putUser(name, body) {
  const r = await fetch("/api/user", {
    method: "PUT",
    headers: { "x-username": name, "content-type": "application/json" },
    body,
  });
  if (!r.ok) throw new Error("status " + r.status);
}
