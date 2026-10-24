import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { authClient, displayName } from "../lib/auth";
import {
  expectSignedIn,
  fetchHistory,
  putHistory,
  setSignedInHint,
} from "../lib/storage";
import {
  deleteProgress,
  fetchProgressList,
  putProgress,
} from "../lib/progress";

// Accounts: Google sign-in via Better Auth (session cookie). user = {v:1, stars:[drillKey], drills:{drillKey:{runs,last,score,found:[itemKey],credited:[itemKey],ignored:[itemKey]}}}
// The record is mutated in place (mutate) and saved with a debounced whole-record PUT to /api/history. Guests save nothing.
// Rounds in progress are autosaved separately, one small snapshot per quiz (/api/progress): progress = {quizId: {updated, got, total}}.
const Ctx = createContext(null);
export const useAccount = () => useContext(Ctx);

export function AccountProvider({ children }) {
  const { data: session, isPending } = authClient.useSession();
  const uid = session?.user?.id ?? null;
  const [loaded, setLoaded] = useState(null); // id of the user whose record is in userRef
  const [ready, setReady] = useState(!expectSignedIn()); // false while the saved record is being restored
  const [version, bump] = useState(0); // bumped on every in-place change so consumers re-render
  const [saveMsg, setSaveMsg] = useState("");
  const userRef = useRef(null);
  const acctRef = useRef(null); // id of the signed-in user once their record is loaded; saves are skipped while null
  const saveT = useRef(null);
  const chain = useRef(Promise.resolve());
  const progressRef = useRef({}); // quizId -> {updated, got, total}, for the quizzes with a round in progress
  const pendingProgress = useRef(new Map()); // quizId -> snapshot not yet sent
  const progressT = useRef(null);
  const progressChain = useRef(Promise.resolve()); // serialised, so a delete can't be overtaken by an older save
  const acct = uid && loaded === uid ? displayName(session.user) : null;

  const flush = useCallback(() => {
    if (!acctRef.current || saveT.current == null) return;
    clearTimeout(saveT.current);
    saveT.current = null;
    const body = JSON.stringify(userRef.current);
    // serialised so an older state can't land last
    chain.current = chain.current
      .then(() => putHistory(body))
      .then(
        () => setSaveMsg(""),
        () => setSaveMsg("Save failed"),
      );
  }, []);

  const save = useCallback(() => {
    if (!acctRef.current) return;
    clearTimeout(saveT.current);
    saveT.current = setTimeout(flush, 500);
  }, [flush]);

  const mutate = useCallback(
    (fn) => {
      if (!userRef.current) return;
      fn(userRef.current);
      bump((n) => n + 1);
      save();
    },
    [save],
  );

  // Send the snapshots waiting for the debounce (keepalive: the page may be closing)
  const flushProgress = useCallback((keepalive = false) => {
    clearTimeout(progressT.current);
    progressT.current = null;
    const waiting = [...pendingProgress.current];
    pendingProgress.current.clear();
    waiting.forEach(([id, snap]) => {
      const body = JSON.stringify(snap);
      progressChain.current = progressChain.current
        .then(() => putProgress(id, body, keepalive))
        .catch(() => {}); // autosave is best effort; the next change tries again
    });
  }, []);

  const saveProgress = useCallback(
    (id, snap) => {
      if (!acctRef.current) return;
      const known = id in progressRef.current;
      progressRef.current[id] = {
        updated: Date.now(),
        got: snap.got,
        total: snap.total,
      };
      if (!known) bump((n) => n + 1); // menus now offer Resume
      pendingProgress.current.set(id, snap);
      clearTimeout(progressT.current);
      progressT.current = setTimeout(flushProgress, 1500);
    },
    [flushProgress],
  );

  const dropProgress = useCallback((id) => {
    if (!acctRef.current) return;
    pendingProgress.current.delete(id);
    if (!(id in progressRef.current)) return;
    delete progressRef.current[id];
    bump((n) => n + 1);
    progressChain.current = progressChain.current
      .then(() => deleteProgress(id))
      .catch(() => {});
  }, []);

  const toggleStar = useCallback(
    (key) =>
      mutate((u) => {
        const i = u.stars.indexOf(key);
        i < 0 ? u.stars.push(key) : u.stars.splice(i, 1);
      }),
    [mutate],
  );

  const logout = useCallback(async () => {
    flush();
    flushProgress();
    await Promise.all([chain.current, progressChain.current]);
    try {
      await authClient.signOut(); // the session goes null; the effect below resets the state
      setSignedInHint(false);
    } catch {
      setSaveMsg("Could not log out");
    }
  }, [flush, flushProgress]);

  // Load the saved record whenever the signed-in user changes
  useEffect(() => {
    if (isPending) return;
    acctRef.current = null;
    userRef.current = null;
    progressRef.current = {};
    pendingProgress.current.clear();
    setLoaded(null);
    if (!uid) {
      setSignedInHint(false);
      setSaveMsg("");
      setReady(true);
      return;
    }
    let live = true;
    setReady(false);
    Promise.all([
      fetchHistory(),
      fetchProgressList().catch(() => ({})), // losing the autosaves isn't worth failing the load
    ])
      .then(([u, progress]) => {
        if (!live) return;
        if (!u) return setSignedInHint(false);
        userRef.current = u;
        progressRef.current = progress;
        acctRef.current = uid;
        setSignedInHint(true);
        setLoaded(uid);
        bump((n) => n + 1);
      })
      .catch(() => live && setSaveMsg("Could not load your history"))
      .finally(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [isPending, uid]);

  useEffect(() => {
    const f = () => {
      flush();
      flushProgress(true);
    };
    const hidden = () => document.hidden && f();
    document.addEventListener("visibilitychange", hidden);
    // Safari does not reliably fire visibilitychange when a page is reloaded or closed
    window.addEventListener("pagehide", f);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", f);
    };
  }, [flush, flushProgress]);

  const value = useMemo(
    () => ({
      acct,
      profile: acct ? session.user : null,
      ready,
      user: userRef.current,
      progress: progressRef.current,
      version,
      saveMsg,
      mutate,
      toggleStar,
      flush,
      saveProgress,
      dropProgress,
      flushProgress,
      logout,
    }),
    [
      acct,
      session,
      ready,
      version,
      saveMsg,
      mutate,
      toggleStar,
      flush,
      saveProgress,
      dropProgress,
      flushProgress,
      logout,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
