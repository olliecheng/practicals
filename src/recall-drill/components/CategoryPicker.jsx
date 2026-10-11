import { useEffect, useState } from "react";

// A modal to choose a category for a quiz section: one of the allowed names, or a custom one typed in the box at the bottom
// of the list (a custom name is only used for this category; it is never added to the list). Clicking a name selects it; Add confirms.
//   status      "loading" | "ok" | "error", the state of loading the categories
//   categories  the names on offer
//   taken       lowercase names the section already uses for other categories (a custom name can't repeat one)
//   current     the category being changed, selected (or typed into the custom box) to begin with (null when adding a new one)
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
  const [custom, setCustom] = useState(current && !listed ? current : "");
  const [filter, setFilter] = useState("");
  useEffect(() => {
    const key = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  const q = filter.trim().toLowerCase();
  const shown = categories.filter((c) => c.toLowerCase().includes(q));
  const typed = custom.trim();
  const repeat = taken.includes(typed.toLowerCase());
  // A typed name wins over the list; a selection the filter hides doesn't count. A typed name that spells a listed one uses its spelling.
  const chosen = typed
    ? (categories.find((c) => c.toLowerCase() === typed.toLowerCase()) ?? typed)
    : shown.includes(selected)
      ? selected
      : null;
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
        <div className="pick" role="listbox" aria-label="Categories">
          {note && <p className="note">{note}</p>}
          {shown.map((c) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={!typed && c === chosen}
              className={"subbtn" + (!typed && c === chosen ? " on" : "")}
              onClick={() => {
                setSelected(c);
                setCustom("");
              }}
            >
              {c}
            </button>
          ))}
          <input
            className="pick-custom"
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault(); // the editor's form would save the quiz
              if (canPick) onPick(chosen);
            }}
            placeholder="Custom category"
            aria-label="Custom category"
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
          />
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
