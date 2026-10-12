import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

// Replacement for the browser's alert() and confirm(), which some browsers don't show. useDialog() gives promise-based helpers:
//   const { alert, confirm, ask } = useDialog();
//   await alert("Could not save.");
//   if (!(await confirm({ message: "Delete this?", unsafe: "Delete" }))) return;
// ask({title?, message, safe = "OK", unsafe?}) is the general form: `safe` labels the green primary button and `unsafe` (optional)
// the red one. It resolves true only when the unsafe button was clicked; the safe button, a click on the dimmed page and Escape
// all resolve false. The keyboard is otherwise disabled, so Enter can never run the unsafe action.
const DialogContext = createContext(null);
export const useDialog = () => useContext(DialogContext);

function DialogModal({ title, message, safe = "OK", unsafe, done }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    // Nothing is focused, so Enter / Space can't press a button; focus goes back where it was afterwards
    const prev = document.activeElement;
    prev?.blur?.();
    ref.current.focus();
    // Capture phase, so nothing underneath (the answer box, the tile menu) sees a key while the dialog is open
    const key = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "keydown" && e.key === "Escape") done(false);
    };
    const types = ["keydown", "keypress", "keyup"];
    types.forEach((t) => document.addEventListener(t, key, true));
    return () => {
      types.forEach((t) => document.removeEventListener(t, key, true));
      prev?.focus?.();
    };
  }, [done]);

  return (
    <div
      className="modal-bg dialog-bg"
      onMouseDown={(e) => e.target === e.currentTarget && done(false)}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className="modal qe-card dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title ? id + "-title" : undefined}
        aria-describedby={id + "-message"}
      >
        {title && (
          <h3 id={id + "-title"} className="qe-title">
            {title}
          </h3>
        )}
        <p id={id + "-message"} className="dialog-msg">
          {message}
        </p>
        <div className="modal-row">
          {unsafe && (
            <button
              type="button"
              className="dlg-unsafe"
              onClick={() => done(true)}
            >
              {unsafe}
            </button>
          )}
          <button
            type="button"
            className="dlg-safe"
            onClick={() => done(false)}
          >
            {safe}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DialogProvider({ children }) {
  const [req, setReq] = useState(null); // {opts, resolve} of the dialog on screen
  const reqRef = useRef(null);
  const done = useCallback((result) => {
    const r = reqRef.current;
    if (!r) return;
    reqRef.current = null;
    setReq(null);
    r.resolve(result);
  }, []);
  const ask = useCallback(
    (opts) =>
      new Promise((resolve) => {
        reqRef.current?.resolve(false); // one dialog at a time: the one being replaced counts as dismissed
        reqRef.current = { opts, resolve };
        setReq(reqRef.current);
      }),
    [],
  );
  const api = useMemo(
    () => ({
      ask,
      alert: (message, opts) => ask({ ...opts, message }),
      confirm: (opts) => ask({ safe: "Cancel", ...opts }),
    }),
    [ask],
  );
  return (
    <DialogContext.Provider value={api}>
      {children}
      {req && <DialogModal {...req.opts} done={done} />}
    </DialogContext.Provider>
  );
}
