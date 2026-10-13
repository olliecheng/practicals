// Autosaved rounds in progress (see worker/progress.js). `updated` is the save time in epoch ms.
import { api } from "./api";

// Back within this long: the round is restored silently; after it the player is asked.
// TODO: 20 seconds while testing; the real value is 5 * 60 * 1000.
export const RESUME_AFTER = 20 * 1000;

// {quizId: {updated, got, total}} for every quiz with a round in progress
export const fetchProgressList = async () =>
  (await api("GET", "/api/progress")).items;

// The snapshot (with `updated`), or null when there is none
export async function fetchProgress(id) {
  try {
    const r = await api("GET", "/api/progress/" + encodeURIComponent(id));
    return { ...r.data, updated: r.updated };
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

// keepalive lets the request finish while the page is closing (the body is far below its 64 KB limit)
export async function putProgress(id, body, keepalive = false) {
  const r = await fetch("/api/progress/" + encodeURIComponent(id), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
    keepalive,
  });
  if (!r.ok) throw new Error("status " + r.status);
}

export const deleteProgress = (id) =>
  api("DELETE", "/api/progress/" + encodeURIComponent(id));
