import { useEffect, useLayoutEffect, useRef, useState } from "react";
import AutoArea from "./AutoArea";
import { toKeywords, toText } from "../lib/editItem";
import { rx } from "../lib/match";
import PencilIcon from "./PencilIcon";

// 16px outline icons for the menu entries (see DESIGN.md)
const Icon = ({ d }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);
export const ICONS = {
  got: <Icon d="M20 6 9 17l-5-5" />,
  didnt: <Icon d="M18 6 6 18M6 6l12 12" />,
  ignore: (
    <Icon d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.9 9.9 0 0 1 12 5c6 0 9.5 7 9.5 7a15 15 0 0 1-2.6 3.4M6.6 6.6A15 15 0 0 0 2.5 12S6 19 12 19a9.7 9.7 0 0 0 4.4-1" />
  ),
  restore: (
    <Icon d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
  ),
  teach: <Icon d="M12 5v14M5 12h14" />,
  edit: <PencilIcon />,
};

// The right-click menu of a revealed tile, drawn at the cursor. `entries` is [{label, onClick, danger?}]; it closes on
// Escape, a click outside, scrolling or a choice.
export function TileMenu({ x, y, entries, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y });
  // Keep the menu inside the window
  useLayoutEffect(() => {
    const r = ref.current.getBoundingClientRect();
    setPos({
      left: Math.max(4, Math.min(x, window.innerWidth - r.width - 4)),
      top: Math.max(4, Math.min(y, window.innerHeight - r.height - 4)),
    });
  }, [x, y]);
  useEffect(() => {
    const away = (e) => ref.current?.contains(e.target) || onClose();
    const key = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);
  return (
    <div ref={ref} className="tilemenu" role="menu" style={pos}>
      {entries.map((e) => (
        <button
          key={e.label}
          className="subbtn"
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            e.onClick();
          }}
        >
          {e.icon}
          {e.label}
        </button>
      ))}
    </div>
  );
}

// A modal to teach an item a new keyword (mode "teach") or edit its label and keywords (mode "edit").
// onSave(patch) saves ({keywords} or {label, keywords}, keywords as "a|b|c") and may throw an Error to show its message.
export function ItemDialog({ mode, item, onSave, onClose }) {
  const [label, setLabel] = useState(item.label);
  const [kw, setKw] = useState(mode === "edit" ? toText(item.keywords) : "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  useEffect(() => {
    input.current?.focus();
    const key = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    const add = toKeywords(kw);
    let keywords = add;
    if (mode === "teach") {
      if (!add) return setErr("Enter a keyword.");
      keywords = item.keywords ? `${item.keywords}|${add}` : add;
    } else if (!label.trim()) return setErr("The item needs a name.");
    try {
      rx(keywords);
    } catch {
      return setErr("That keyword isn't valid.");
    }
    setBusy(true);
    try {
      await onSave(
        mode === "teach" ? { keywords } : { label: label.trim(), keywords },
      );
      onClose();
    } catch (e) {
      setErr(e.message || "Could not save.");
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-bg"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="modal qe-card"
        role="dialog"
        aria-modal="true"
        aria-label={mode === "teach" ? "Teach new keyword" : "Edit item"}
        onSubmit={submit}
      >
        <h3 className="qe-title">
          {mode === "teach" ? "Teach new keyword" : "Edit item"}
        </h3>
        {mode === "teach" ? (
          <>
            <p className="note" style={{ margin: "0 0 10px" }}>
              Typing this will now count as “{item.label}”.
            </p>
            <label className="qe-kwlbl" htmlFor="teach-kw">
              New keyword
            </label>
            <input
              id="teach-kw"
              ref={input}
              className="modal-in"
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              placeholder="e.g. a synonym or abbreviation"
              autoComplete="off"
            />
          </>
        ) : (
          <>
            <AutoArea
              className="qe-label"
              value={label}
              fitKey
              placeholder="Item"
              aria-label="Item"
              onChange={setLabel}
            />
            <label className="qe-kwlbl" htmlFor="edit-kw">
              Keywords
            </label>
            <AutoArea
              id="edit-kw"
              className="qe-matchbox"
              value={kw}
              fitKey
              placeholder="Matches, comma separated"
              aria-label="Matches"
              onChange={setKw}
            />
          </>
        )}
        {err && (
          <div className="qe-error" role="alert" style={{ marginTop: 10 }}>
            <strong>Errors</strong>
            {err}
          </div>
        )}
        <div className="modal-row">
          <button type="button" className="subbtn" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {mode === "teach" ? "Add" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
