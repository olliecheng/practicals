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

// Accounts: Google sign-in via Better Auth (session cookie). user = {v:1, stars:[drillKey], drills:{drillKey:{runs,last,score,found:[itemKey],credited:[itemKey],ignored:[itemKey]}}}
// The record is mutated in place (mutate) and saved with a debounced whole-record PUT to /api/history. Guests save nothing.
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
    await chain.current;
    try {
      await authClient.signOut(); // the session goes null; the effect below resets the state
      setSignedInHint(false);
    } catch {
      setSaveMsg("Could not log out");
    }
  }, [flush]);

  // Load the saved record whenever the signed-in user changes
  useEffect(() => {
    if (isPending) return;
    acctRef.current = null;
    userRef.current = null;
    setLoaded(null);
    if (!uid) {
      setSignedInHint(false);
      setSaveMsg("");
      setReady(true);
      return;
    }
    let live = true;
    setReady(false);
    fetchHistory()
      .then((u) => {
        if (!live) return;
        if (!u) return setSignedInHint(false);
        userRef.current = u;
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
    const f = () => document.hidden && flush();
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [flush]);

  const value = useMemo(
    () => ({
      acct,
      profile: acct ? session.user : null,
      ready,
      user: userRef.current,
      version,
      saveMsg,
      mutate,
      toggleStar,
      flush,
      logout,
    }),
    [acct, session, ready, version, saveMsg, mutate, toggleStar, flush, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
