import { createContext, useContext, useMemo, useState } from "react";
import { DATA, PRES, SYSTEMS } from "../lib/data";

// What the home screen has selected; also decides which drills "Random" / "Next" / "New" pick from.
const Ctx = createContext(null);
export const useFilters = () => useContext(Ctx);

export function FilterProvider({ children }) {
  const [mode, setMode] = useState("cond");
  const [selSys, setSelSys] = useState(() => new Set(SYSTEMS));
  const [starOnly, setStarOnly] = useState(false);

  const value = useMemo(() => {
    const toggleSys = (s) =>
      setSelSys((cur) => {
        const n = new Set(cur);
        n.has(s) ? n.delete(s) : n.add(s);
        if (!n.size) n.add(s);
        return n;
      });
    // user: the account's record (or null) for the starred filter
    const pool = (m, user) =>
      (m === "cond" ? DATA.filter((d) => selSys.has(d.system)) : PRES).filter(
        (d) => !starOnly || (user && user.stars.includes(d.key)),
      );
    const randPick = (m, user, cur) => {
      const p = pool(m, user).filter((d) => d !== cur);
      const q = p.length ? p : pool(m, user);
      return q[Math.floor(Math.random() * q.length)];
    };
    return {
      mode,
      setMode,
      selSys,
      toggleSys,
      starOnly,
      setStarOnly,
      pool,
      randPick,
    };
  }, [mode, selSys, starOnly]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
