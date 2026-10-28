import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFilters } from "../state/FilterContext";
import { drillPath } from "./legacy";

// Closes an open row when something outside it is clicked
export function useOutsideClose(ref, open, close) {
  useEffect(() => {
    if (!open) return;
    const f = (e) => ref.current && !ref.current.contains(e.target) && close();
    document.addEventListener("click", f);
    return () => document.removeEventListener("click", f);
  }, [open, ref, close]);
}

// The open state and side of a row's pop-up menu (the `.cell` > `.menu` markup). `place` picks the side: to the right of the cell if it fits
// in the viewport, else to the left ("l") if it fits there, else below the cell ("b"; a row that spans the page, as in the stacked layout).
// Use `side` as an extra class on `.menu`. Clicking a row only opens the menu (it also shows on hover), right-click opens it,
// Enter or Space on the focused row toggles it, and a click elsewhere closes it. Spread `rowProps` on the focusable row inside the cell.
const MENU_WIDTH = 174; // the menu's 170px minimum plus its 4px gap to the cell
export function useRowMenu() {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState("");
  const ref = useRef(null);
  useOutsideClose(ref, open, () => setOpen(false));
  const place = () => {
    if (!ref.current) return;
    const { left, right } = ref.current.getBoundingClientRect();
    const room = document.documentElement.clientWidth;
    setSide(
      right + MENU_WIDTH <= room ? "" : left - MENU_WIDTH >= 0 ? "l" : "b",
    );
  };
  const toggle = () => {
    setOpen((o) => !o);
    place();
  };
  const rowProps = {
    tabIndex: 0,
    role: "button",
    onClick: toggle,
    onContextMenu: (e) => {
      e.preventDefault();
      setOpen(true);
      place();
    },
    onKeyDown: (e) => {
      if (
        e.target === e.currentTarget &&
        (e.key === "Enter" || e.key === " ")
      ) {
        e.preventDefault();
        toggle();
      }
    },
  };
  return { ref, open, side, place, rowProps };
}

// Start a drill, optionally redoing the incorrect ones from the saved record (or from one given attempt, {found, credited}). Redoing discards the quiz's autosaved round (fresh);
// a plain start leaves it, so the drill carries on from it or asks. The playlist being browsed goes with it,
// so the drill's Back / New / Next stay in that playlist.
export const useStart = (drill) => {
  const nav = useNavigate();
  const { playlistId } = useFilters();
  return (inc, attempt) =>
    nav(drillPath(drill.key), {
      state: {
        inc: inc
          ? attempt
            ? { found: attempt.found, credited: attempt.credited }
            : true
          : undefined,
        fresh: inc ? true : undefined,
        playlist: playlistId || undefined,
      },
    });
};
