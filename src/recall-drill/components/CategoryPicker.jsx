import { useEffect, useState } from "react";

// A modal to choose a category for a quiz section: one textbox filters the list of allowed names, and whatever is typed that isn't
// a listed name is offered as the last row of the list (a custom name is only used for this category; it is never added to the
// Settings list). Clicking a name selects it; Add confirms (so does Enter in the textbox).
//   status      "loading" | "ok" | "error", the state of loading the categories
//   categories  the names on offer
//   taken       lowercase names the section already uses for other categories (a typed name can't repeat one)
//   current     the category being changed, selected (or typed into the textbox if unlisted) to begin with (null when adding a new one)
//   confirmLabel the confirm button's text ("Add" for a new category, "Edit" when changing one)
//   onPick(name) called with the chosen name when the confirm button is pressed (the caller closes the modal)
export default function CategoryPicker({
  status,
  categories,
  taken = [],
  current = null,
  confirmLabel = "Add",
  onPick,
  onClose,
}) {
  const listed = current
    ? categories.find((c) => c.toLowerCase() === current.toLowerCase())
    : null;
  const [selected, setSelected] = useState(listed ?? null);
  const [filter, setFilter] = useState(current && !listed ? current : "");
  useEffect(() => {
    const key = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  const typed = filter.trim();
  const q = typed.toLowerCase();
  const shown = categories.filter((c) => c.toLowerCase().includes(q));
  // A typed name that spells a listed one uses its spelling; any other typed name is the custom option at the bottom
  const exact = categories.find((c) => c.toLowerCase() === q);
  const custom = typed && !exact ? typed : null;
  const repeat = taken.includes(q);
  // A selection the filter hides doesn't count; with none, the typed name is chosen
  const chosen = shown.includes(selected) ? selected : (exact ?? custom);
  const canPick = chosen && !repeat;

  const note =
    status === "loading"
      ? "Loading..."
      : status === "error"
        ? "Could not load the categories."
        : !categories.length
          ? "No categories left to add."
          : !shown.length && "No categories match.";

  return (
    <div
      className="modal-bg"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal qe-card pick-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a category"
      >
        <h3 className="qe-title">Choose a category</h3>
        <input
          className="modal-in pick-filter"
          type="text"
          autoFocus
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setSelected(null); // what is typed now decides, not an earlier click
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault(); // the editor's form would save the quiz
            if (canPick) onPick(chosen);
          }}
          placeholder="Search or type a new category"
          aria-label="Search or type a category"
          maxLength={100}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="pick" role="listbox" aria-label="Categories">
          {note && !custom && <p className="note">{note}</p>}
          {shown.map((c) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={c === chosen}
              className={"subbtn" + (c === chosen ? " on" : "")}
              onClick={() => setSelected(c)}
            >
              {c}
            </button>
          ))}
          {custom && (
            <button
              type="button"
              role="option"
              aria-selected={custom === chosen}
              className={"subbtn custom" + (custom === chosen ? " on" : "")}
              onClick={() => setSelected(null)}
            >
              Use “{custom}”
            </button>
          )}
        </div>
        {repeat && (
          <p className="note" style={{ margin: "8px 0 0" }}>
            This section already has that category.
          </p>
        )}
        <div className="modal-row">
          <button type="button" className="subbtn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="subbtn primary"
            disabled={!canPick}
            onClick={() => onPick(chosen)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
