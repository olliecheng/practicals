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

// The open / flipped state of a row's pop-up menu (the `.cell` > `.menu` markup): `place` opens the menu to the right of the cell, or to
// the left (`left`) if it wouldn't fit in the viewport. Clicking a row only opens the menu (it also shows on hover), right-click opens it,
// Enter or Space on the focused row toggles it, and a click elsewhere closes it. Spread `rowProps` on the focusable row inside the cell.
export function useRowMenu() {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, open, () => setOpen(false));
  const place = () =>
    ref.current &&
    setLeft(
      ref.current.getBoundingClientRect().right + 170 >
        document.documentElement.clientWidth,
    );
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
  return { ref, open, left, place, rowProps };
}

// Start a drill, optionally redoing the incorrect ones from the saved record. The playlist being browsed goes with it,
// so the drill's Back / New / Next stay in that playlist.
export const useStart = (drill) => {
  const nav = useNavigate();
  const { playlistId } = useFilters();
  return (inc) =>
    nav(drillPath(drill.key), {
      state: { inc: inc ? true : undefined, playlist: playlistId || undefined },
    });
};
