import { useState } from "react";
import AutoArea from "./AutoArea";

const TrashIcon = () => (
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
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
  </svg>
);

// An editable item as a card: closed it is just its text (a rounded tint on hover); clicking or tabbing into it opens it, showing
// the keywords and a Delete button, and it closes again when focus leaves it. Used by the quiz editor and meant for editing
// items from the drill screen too. The classes (qe-*, subbtn) are in recall-drill.css.
//   id                  unique per card on the page (ties the Keywords label to its box)
//   label, keywords     the text (keywords as a comma separated list)
//   onChange(patch)     {label} or {keywords}
//   onDelete            when given, the open card shows a Delete button (it should confirm itself)
//   handle              node on the left of the text while closed (e.g. a drag handle); focus on it doesn't open the card
//   rootRef, className, style, labelProps (e.g. data-id)   for the wrapper and the text box
export default function ItemCard({
  label,
  keywords,
  onChange,
  onDelete,
  handle,
  rootRef,
  className = "",
  style,
  labelProps,
  id,
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      ref={rootRef}
      style={style}
      className={"qe-item" + (open ? " open" : "") + className}
      onFocus={() => setOpen(true)}
      onBlur={(e) =>
        e.currentTarget.contains(e.relatedTarget) || setOpen(false)
      }
    >
      <div className="qe-row1">
        {!open && handle && (
          <span className="ic-handle" onFocus={(e) => e.stopPropagation()}>
            {handle}
          </span>
        )}
        <AutoArea
          {...labelProps}
          className="qe-label"
          fitKey={open}
          value={label}
          placeholder="Item"
          aria-label="Item"
          onChange={(label) => onChange({ label })}
        />
      </div>
      {open && (
        <div className="qe-matches">
          <label className="qe-kwlbl" htmlFor={"kw-" + id}>
            Keywords
          </label>
          <AutoArea
            id={"kw-" + id}
            className="qe-matchbox"
            fitKey={open}
            placeholder="Matches, comma separated"
            aria-label="Matches"
            value={keywords}
            onChange={(keywords) => onChange({ keywords })}
          />
          {onDelete && (
            <div className="qe-delrow">
              <button
                type="button"
                className="subbtn danger"
                aria-label="Delete item"
                title="Delete item"
                onClick={onDelete}
              >
                <TrashIcon />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
