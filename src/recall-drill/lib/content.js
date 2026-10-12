// Loading quizzes and playlists from the API. Responses are remembered for the session (they only change when someone edits
// content, bust() drops them, as savePlaylist does), so moving between screens doesn't flash a loading state.
import { useEffect, useState } from "react";
import { api } from "./api";
import { FEATURED } from "./legacy";

const pending = new Map(); // path -> promise
const done = new Map(); // path -> data

export function load(path) {
  if (!pending.has(path)) {
    pending.set(
      path,
      api("GET", path).then(
        (data) => (done.set(path, data), data),
        (e) => {
          pending.delete(path); // retry next time
          throw e;
        },
      ),
    );
  }
  return pending.get(path);
}

export const bust = () => {
  pending.clear();
  done.clear();
};

// {status: "loading" | "ok" | "error", data, error}; path null = nothing to load
export function useLoad(path) {
  const [state, setState] = useState(() =>
    path && done.has(path)
      ? { status: "ok", data: done.get(path) }
      : { status: "loading" },
  );
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!path) return;
    if (done.has(path)) return setState({ status: "ok", data: done.get(path) });
    let live = true;
    setState({ status: "loading" });
    load(path).then(
      (data) => live && setState({ status: "ok", data }),
      (error) => live && setState({ status: "error", error }),
    );
    return () => {
      live = false;
    };
  }, [path, attempt]);
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

// Replaces a playlist's data ({title, description, sections:[{title, quiz_ids}]}) and drops the cached reads
export const savePlaylist = async (id, data) => {
  const r = await api("PUT", `/api/playlists/${id}`, data);
  bust();
  return r;
};

// Soft-deletes a quiz (it stays in the database and in playlists' lists, but is hidden and can't be played) and drops the cached reads
export const deleteQuiz = async (id) => {
  const r = await api("PUT", `/api/quizzes/${id}/deleted`, { deleted: true });
  bust();
  return r;
};

// Replaces a quiz's data (see lib/data.js) and drops the cached reads
export const saveQuiz = async (id, data) => {
  const r = await api("PUT", `/api/quizzes/${id}`, data);
  bust();
  return r;
};

// Creates a quiz called `name` with an empty section for each of `sections` (the playlist's New quiz template) and drops the cached reads.
// Resolves to the new quiz's id. It isn't in any playlist yet: addQuizToPlaylist does that.
export const createQuiz = async (name, sections) => {
  const r = await api("POST", "/api/quizzes", {
    name,
    items: Object.fromEntries(sections.map((s) => [s, {}])),
  });
  bust();
  return r.id;
};

// Appends a quiz to the end of the playlist's `sectionIndex`th section. The playlist is read afresh first (not from the cache), so
// an edit made by someone else in the meantime isn't overwritten by this replace.
export const addQuizToPlaylist = async (playlistId, sectionIndex, quizId) => {
  bust();
  const pl = await load(`/api/playlists/${playlistId}?quizzes=meta`);
  if (!pl.sections[sectionIndex])
    throw new Error("That section is no longer in the playlist.");
  await savePlaylist(playlistId, {
    title: pl.title,
    description: pl.description,
    quiz_settings: pl.quiz_settings,
    sections: pl.sections.map((s, i) => ({
      title: s.title,
      quiz_ids: [
        ...s.quizzes.map((q) => q.id),
        ...(i === sectionIndex ? [quizId] : []),
      ],
    })),
  });
};

// Asks the server to check a quiz body without saving it: {ok: true, summary} or {ok: false, errors}
export const validateQuiz = (data) =>
  api("POST", "/api/quizzes/validate", data);

// The categories in a quiz body that aren't in the Settings list (any case), as messages. The server doesn't check
// category names; the Agentic tab uses this to keep to the list. Malformed shapes are skipped (the server reports them).
export const categoryErrors = (data, categories) => {
  const known = new Set(categories.map((c) => c.toLowerCase()));
  const items = data?.items;
  if (!items || typeof items !== "object" || Array.isArray(items)) return [];
  return Object.entries(items).flatMap(([section, sec]) =>
    !sec || typeof sec !== "object" || Array.isArray(sec)
      ? []
      : Object.keys(sec)
          .filter((cat) => !known.has(cat.toLowerCase()))
          .map((cat) => `${section}: "${cat}" is not a valid category.`),
  );
};

// The sections of a quiz body that were added, renamed or dropped compared with `sections` (any case, order ignored), as messages.
// The Agentic tab uses this to keep the quiz's sections as they are. Malformed shapes are skipped (the server reports them).
export const sectionErrors = (data, sections) => {
  const items = data?.items;
  if (!items || typeof items !== "object" || Array.isArray(items)) return [];
  const norm = (n) => n.trim().toLowerCase();
  const had = new Set(sections.map(norm));
  const has = new Set(Object.keys(items).map(norm));
  return [
    ...Object.keys(items)
      .filter((n) => !had.has(norm(n)))
      .map(
        (n) =>
          `"${n}" is not one of the quiz's sections; keep them as they are.`,
      ),
    ...sections
      .filter((n) => !has.has(norm(n)))
      .map(
        (n) =>
          `The section "${n}" is missing; keep the quiz's sections as they are.`,
      ),
  ];
};

// The playlist with its quizzes grouped by section; meta leaves the quiz bodies out
export const usePlaylist = (id, { meta } = {}) =>
  useLoad(id ? `/api/playlists/${id}${meta ? "?quizzes=meta" : ""}` : null);

// The three built-in playlists (meta form), in Home order: {status, data: [playlist...], retry}
export function useFeaturedPlaylists() {
  const paths = FEATURED.map((f) => `/api/playlists/${f.id}?quizzes=meta`);
  const ready = () =>
    paths.every((p) => done.has(p))
      ? { status: "ok", data: paths.map((p) => done.get(p)) }
      : { status: "loading" };
  const [state, setState] = useState(ready);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (paths.every((p) => done.has(p))) return setState(ready());
    let live = true;
    setState({ status: "loading" });
    Promise.all(paths.map(load)).then(
      (data) => live && setState({ status: "ok", data }),
      (error) => live && setState({ status: "error", error }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

// The global settings {agentQuizPrompt, categories}
export const useSettings = () => useLoad("/api/settings");

// Replaces the given settings (any of the keys) and drops the cached reads; resolves to all the settings
export const saveSettings = async (patch) => {
  const r = await api("PUT", "/api/settings", patch);
  bust();
  return r;
};

export const useQuiz = (id) => useLoad(id ? `/api/quizzes/${id}` : null);

// Full quizzes for a set of ids (history rows), fetched in chunks of 100. Deleted quizzes are not returned.
// Resolves to a Map id -> quiz.
export function useQuizzesById(ids) {
  const key = [...ids].sort().join(",");
  const [state, setState] = useState({ status: "loading", map: new Map() });
  useEffect(() => {
    const list = key ? key.split(",") : [];
    if (!list.length) return setState({ status: "ok", map: new Map() });
    let live = true;
    const chunks = [];
    for (let i = 0; i < list.length; i += 100)
      chunks.push(list.slice(i, i + 100));
    Promise.all(
      chunks.map((c) => load(`/api/quizzes?full=1&ids=${c.join(",")}`)),
    ).then(
      (parts) => {
        const map = new Map();
        parts.forEach((p) => p.items.forEach((q) => map.set(q.id, q)));
        live && setState({ status: "ok", map });
      },
      (error) => live && setState({ status: "error", map: new Map(), error }),
    );
    return () => {
      live = false;
    };
  }, [key]);
  return state;
}

// All of a playlist's quizzes, flat, in order, without the deleted ones. Works on the meta or the full form.
export const playlistQuizzes = (pl) =>
  pl.sections.flatMap((s) => s.quizzes).filter((q) => !q.deleted);
