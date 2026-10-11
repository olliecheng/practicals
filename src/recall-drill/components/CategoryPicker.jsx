import { useEffect, useState } from "react";

// A modal to choose one of the allowed categories for a quiz section. Clicking a name selects it; Add confirms.
//   status      "loading" | "ok" | "error", the state of loading the categories
//   categories  the names on offer
//   current     the category being changed, selected to begin with (null when adding a new one)
//   confirmLabel the confirm button's text ("Add" for a new category, "Edit" when changing one)
//   onPick(name) called with the chosen name when the confirm button is pressed (the caller closes the modal)
export default function CategoryPicker({
  status,
  categories,
  current = null,
  confirmLabel = "Add",
  onPick,
  onClose,
}) {
  const [selected, setSelected] = useState(current);
  const [filter, setFilter] = useState("");
  useEffect(() => {
    const key = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  const q = filter.trim().toLowerCase();
  const shown = categories.filter((c) => c.toLowerCase().includes(q));
  const chosen = shown.includes(selected) ? selected : null; // a selection the filter hides doesn't count

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
        className="modal qe-card"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a category"
      >
        <h3 className="qe-title">Choose a category</h3>
        {categories.length > 0 && (
          <input
            className="modal-in pick-filter"
            type="search"
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter"
            aria-label="Filter categories"
            autoComplete="off"
            spellCheck={false}
          />
        )}
        {note ? (
          <p className="note" style={{ margin: "8px 0 0" }}>
            {note}
          </p>
        ) : (
          <div className="pick" role="listbox" aria-label="Categories">
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
          </div>
        )}
        <div className="modal-row">
          <button type="button" className="subbtn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="subbtn primary"
            disabled={!chosen}
            onClick={() => onPick(chosen)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
