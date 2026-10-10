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
  pl.sections
    .flatMap((s) => s.quizzes)
    .filter((q) => !(q.deleted ?? q.data?.deleted));
