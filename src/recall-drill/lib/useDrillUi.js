import { useEffect } from "react";
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
