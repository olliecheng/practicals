import { createContext, useContext, useMemo, useState } from "react";

// The playlist being browsed (remembered for the session so a reload of a drill keeps its context) and the starred filter.
// They decide which quizzes "Random" / "Next" / "New" pick from: pool and randPick work on arrays of quiz ids.
const Ctx = createContext(null);
export const useFilters = () => useContext(Ctx);

const KEY = "recallDrillPlaylist";
const read = () => {
  try {
    return sessionStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
};

export function FilterProvider({ children }) {
  const [playlistId, setId] = useState(read);
  const [starOnly, setStarOnly] = useState(false);

  const value = useMemo(() => {
    const setPlaylist = (id) => {
      setId(id);
      try {
        sessionStorage.setItem(KEY, id);
      } catch {}
    };
    // user: the account's record (or null) for the starred filter
    const pool = (ids, user) =>
      ids.filter((id) => !starOnly || (user && user.stars.includes(id)));
    const randPick = (ids, user, current) => {
      const p = pool(ids, user).filter((id) => id !== current);
      const q = p.length ? p : pool(ids, user);
      return q[Math.floor(Math.random() * q.length)];
    };
    return { playlistId, setPlaylist, starOnly, setStarOnly, pool, randPick };
  }, [playlistId, starOnly]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
