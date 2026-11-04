import { useEffect } from "react";

// Keeps the answer box focused at all times, except while a modal or the tile menu is open, or while focus sits on something
// deliberate (a button reached by Tab). Clicking anywhere else, or closing a modal, puts the caret back.
export function useKeepFocus(ref, enabled) {
  useEffect(() => {
    if (!enabled) return;
    let t;
    const ensure = () => {
      const el = ref.current;
      if (!el || el.disabled) return;
      if (document.querySelector(".modal-bg, .tilemenu")) return;
      const a = document.activeElement;
      if (a && a !== document.body) return;
      el.focus({ preventScroll: true });
    };
    // Deferred so the newly clicked element has taken focus (or not) first
    const soon = () => {
      clearTimeout(t);
      t = setTimeout(ensure, 0);
    };
    document.addEventListener("focusout", soon);
    // Removing the focused node (a closing modal) fires no focusout
    const mo = new MutationObserver(soon);
    mo.observe(document.body, { childList: true, subtree: true });
    soon();
    return () => {
      clearTimeout(t);
      document.removeEventListener("focusout", soon);
      mo.disconnect();
    };
  }, [ref, enabled]);
}
