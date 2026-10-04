import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchUser, lastUser, putUser, rememberUser } from "../lib/storage";

// Accounts: user = {v:1, stars:[drillKey], drills:{drillKey:{runs,last,score,found:[itemKey],credited:[itemKey],ignored:[itemKey]}}}
// The record is mutated in place (mutate) and saved with a debounced whole-record PUT. Guests save nothing.
const Ctx = createContext(null);
export const useAccount = () => useContext(Ctx);

export function AccountProvider({ children }) {
  const [acct, setAcct] = useState(null); // username
  const [ready, setReady] = useState(!lastUser()); // false while the remembered user is being restored
  const [version, bump] = useState(0); // bumped on every in-place change so consumers re-render
  const [saveMsg, setSaveMsg] = useState("");
  const userRef = useRef(null);
  const acctRef = useRef(null);
  const saveT = useRef(null);
  const chain = useRef(Promise.resolve());

  const flush = useCallback(() => {
    if (!acctRef.current || saveT.current == null) return;
    clearTimeout(saveT.current);
    saveT.current = null;
    const n = acctRef.current,
      body = JSON.stringify(userRef.current);
    // serialised so an older state can't land last
    chain.current = chain.current
      .then(() => putUser(n, body))
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

  const signIn = useCallback((name, user) => {
    acctRef.current = name;
    userRef.current = user;
    rememberUser(name);
    setAcct(name);
    bump((n) => n + 1);
  }, []);

  const logout = useCallback(() => {
    flush();
    acctRef.current = null;
    userRef.current = null;
    rememberUser("");
    setAcct(null);
    setSaveMsg("");
  }, [flush]);

  // Silently restore the remembered user, falling back to guest
  useEffect(() => {
    const n = lastUser();
    if (!n) return;
    let live = true;
    fetchUser(n)
      .then((u) => {
        if (!live) return;
        if (!u) rememberUser("");
        else signIn(n, u);
      })
      .catch(() => {})
      .finally(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [signIn]);

  useEffect(() => {
    const f = () => document.hidden && flush();
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [flush]);

  const value = useMemo(
    () => ({
      acct,
      ready,
      user: userRef.current,
      version,
      saveMsg,
      mutate,
      toggleStar,
      flush,
      signIn,
      logout,
    }),
    [acct, ready, version, saveMsg, mutate, toggleStar, flush, signIn, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
