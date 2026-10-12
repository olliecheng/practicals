// Asks before an editor with unsaved changes is left. useLeaveGuard(dirty) returns {bypass, leave}:
//  - in-app navigation (links, the logo, Back / Forward) is held by the router's blocker and asked with the custom dialog;
//  - closing or reloading the tab can only get the browser's own generic prompt (`beforeunload` ignores the page's text and
//    can't show a dialog), so the listener just asks for it;
//  - bypass() lets the next navigation through (call it right before leaving after a successful Save);
//  - leave(fn) is for exits that aren't navigations (Cancel): runs fn at once when clean, else after the dialog's "Leave".
import { useCallback, useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";
import { useDialog } from "../components/Dialog";

const ask = (confirm) =>
  confirm({
    message: "Your changes are unsaved. Are you sure you want to leave?",
    unsafe: "Leave",
    safe: "Stay",
  });

export function useLeaveGuard(dirty) {
  const { confirm } = useDialog();
  const skip = useRef(false);
  const live = useRef(dirty);
  live.current = dirty;

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      live.current &&
      !skip.current &&
      nextLocation.pathname !== currentLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    ask(confirm).then((leave) => {
      if (leave) blocker.proceed();
      else blocker.reset();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker.state]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      if (skip.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const bypass = useCallback(() => {
    skip.current = true;
  }, []);
  const leave = useCallback(
    async (fn) => {
      if (live.current && !skip.current && !(await ask(confirm))) return;
      skip.current = true;
      fn();
    },
    [confirm],
  );
  return { bypass, leave };
}
