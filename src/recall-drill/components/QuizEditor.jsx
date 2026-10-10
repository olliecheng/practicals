import { Fragment, useEffect, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MODES, SECTION_KEYS } from "../lib/data";
import { saveQuiz } from "../lib/content";
import ItemCard from "./ItemCard";
import { rx } from "../lib/match";
import { toKeywords, toText } from "../lib/editItem";

let nextKey = 0;
const newKey = () => "k" + nextKey++;

// A stored section (plain array, or {"Category": [items]}) as [{key, cat, items:[{key, label, matches}]}]
const toGroups = (sec) =>
  (Array.isArray(sec) ? [["", sec]] : Object.entries(sec || {}))
    .filter(([, list]) => Array.isArray(list) && list.length)
    .map(([cat, list]) => ({
      key: newKey(),
      cat,
      items: list.map((it) => ({
        key: newKey(),
        label: String(it.label ?? ""),
        matches: toText(String(it.keywords ?? "")),
      })),
    }));

const PlusIcon = () => (
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
    <path d="M12 5v14M5 12h14" />
  </svg>
);

// Every cell of a category's grid is placed explicitly (column 1 = hint, column 2 = items; odd rows are gaps, even rows items),
// so the heading keeps its place in the tree when the first item goes away and doesn't remount
const dropId = (groupKey) => "grp:" + groupKey;
const at = (row, col) => ({ gridRow: row, gridColumn: col });

// The gap before row 2n+2: a dotted line in the items column with its "New item" label in the hint column
const Gap = ({ row, onAdd }) => (
  <>
    <span className="qe-newlbl" style={at(row, 1)} aria-hidden="true">
      New item
    </span>
    <button
      type="button"
      className="qe-gap"
      style={at(row, 2)}
      aria-label="New item"
      onClick={onAdd}
    >
      <span />
    </button>
  </>
);

// The category name as heading text with ↑ / ↓ buttons to move the whole category. The name can't be changed afterwards;
// one made by "New category" (fresh) starts in an input with the cursor in it, which turns into text when it's done.
function CategoryHead({ group, set, n, index, count, onMove }) {
  const [editing, setEditing] = useState(!!group.fresh);
  const done = () => {
    setEditing(false);
    if (group.fresh) set({ ...group, fresh: false });
  };
  return (
    // It spans the rows of its items, so its height never stretches the first item's row
    <div
      className="qe-head"
      style={{ gridColumn: 1, gridRow: n ? `2 / span ${2 * n}` : "1 / span 2" }}
    >
      {editing ? (
        <input
          className="edtitle qe-cathead"
          autoFocus={group.fresh}
          value={group.cat}
          placeholder="Category"
          aria-label="Category"
          onChange={(e) => set({ ...group, cat: e.target.value })}
          onBlur={done}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              done();
            }
          }}
        />
      ) : (
        <>
          <span className="qe-catname">{group.cat || "No category"}</span>
          <span className="qe-catmoves">
            {index > 0 && (
              <button
                type="button"
                className="subbtn"
                aria-label="Move category up"
                title="Move category up"
                onClick={() => onMove(-1)}
              >
                ↑ Up
              </button>
            )}
            {index < count - 1 && (
              <button
                type="button"
                className="subbtn"
                aria-label="Move category down"
                title="Move category down"
                onClick={() => onMove(1)}
              >
                ↓ Down
              </button>
            )}
          </span>
        </>
      )}
    </div>
  );
}

// The quiz editor's item: an ItemCard with a handle on its left that drags it to any place in any category
function ItemRow({ it, row, setItem, remove, overlay }) {
  const sort = useSortable({ id: it.key, disabled: overlay });
  if (overlay)
    return (
      <div className="qe-item eddrag">
        <div className="qe-row1">
          <span className="edhandle">⋮⋮</span>
          <span className="qe-label">{it.label || "Item"}</span>
        </div>
      </div>
    );
  return (
    <ItemCard
      id={it.key}
      rootRef={sort.setNodeRef}
      style={{
        ...at(row, 2),
        transform: CSS.Transform.toString(sort.transform),
        transition: sort.transition,
      }}
      className={sort.isDragging ? " dragging" : ""}
      label={it.label}
      keywords={it.matches}
      labelProps={{ "data-id": it.key }}
      onChange={(p) => setItem("keywords" in p ? { matches: p.keywords } : p)}
      onDelete={() =>
        confirm(`Delete ${it.label.trim() || "this item"}?`) && remove()
      }
      handle={
        <button
          type="button"
          className="edhandle"
          aria-label={`Drag ${it.label || "item"}`}
          title="Drag to move"
          ref={sort.setActivatorNodeRef}
          {...sort.attributes}
          {...sort.listeners}
        >
          ⋮⋮
        </button>
      }
    />
  );
}

function Group({
  group,
  index,
  count,
  set,
  remove,
  removeGroup,
  addItem,
  onMove,
}) {
  const n = group.items.length;
  const setItem = (i, patch) =>
    set({
      ...group,
      items: group.items.map((it, j) => (j === i ? { ...it, ...patch } : it)),
    });
  // An empty category has no rows to drop on, so the category itself is a drop target
  const { setNodeRef } = useDroppable({
    id: dropId(group.key),
    disabled: n > 0,
  });
  return (
    <SortableContext
      items={group.items.map((it) => it.key)}
      strategy={verticalListSortingStrategy}
    >
      <div className="qe-cat" ref={setNodeRef}>
        <CategoryHead
          group={group}
          set={set}
          n={n}
          index={index}
          count={count}
          onMove={onMove}
        />
        {group.items.map((it, i) => (
          <Fragment key={it.key}>
            {i > 0 && <Gap row={2 * i + 1} onAdd={() => addItem(i)} />}
            <ItemRow
              it={it}
              row={2 * i + 2}
              setItem={(patch) => setItem(i, patch)}
              remove={() => remove(i)}
            />
          </Fragment>
        ))}
        {!n && (
          <button
            type="button"
            className="qe-delcat"
            style={at(1, 2)}
            onClick={() =>
              confirm(`Delete the category ${group.cat.trim() || ""}?`) &&
              removeGroup()
            }
          >
            Delete category
          </button>
        )}
        <Gap row={2 * n + 1 + (n ? 0 : 1)} onAdd={() => addItem(n)} />
      </div>
    </SortableContext>
  );
}

export default function QuizEditor({ id, quiz, onDone, onCancel }) {
  const d = quiz.data;
  const sections = SECTION_KEYS[d.mode].map(([key, code]) => ({
    key,
    name: MODES[d.mode].sections.find((s) => s.code === code).name,
  }));
  const [tab, setTab] = useState("manual");
  const [name, setName] = useState(d.name);
  const [prompt, setPrompt] = useState(d.prompt ?? "");
  const [groups, setGroups] = useState(() =>
    Object.fromEntries(sections.map((s) => [s.key, toGroups(d[s.key])])),
  );
  const [focus, setFocus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // A new item takes the cursor once it is on the page
  useEffect(() => {
    if (!focus) return;
    document.querySelector(`[data-id="${focus}"]`)?.focus();
    setFocus(null);
  }, [focus]);

  const setSec = (key, fn) => setGroups((g) => ({ ...g, [key]: fn(g[key]) }));
  const setGroup = (key, gi, next) =>
    setSec(key, (gs) => gs.map((g, j) => (j === gi ? next : g)));
  const removeItem = (key, gi, i) =>
    setSec(key, (gs) =>
      gs.map((g, j) =>
        j === gi ? { ...g, items: g.items.filter((_, k) => k !== i) } : g,
      ),
    );
  // Moves a category, with all its items, up (-1) or down (1)
  const moveGroup = (key, gi, d) =>
    setSec(key, (gs) => {
      const next = [...gs];
      [next[gi], next[gi + d]] = [next[gi + d], next[gi]];
      return next;
    });
  const removeGroup = (key, gi) =>
    setSec(key, (gs) => gs.filter((_, j) => j !== gi));

  // Drag and drop: an item can go to any place in any category of any section
  const [dragging, setDragging] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  // {key: section, gi: category index, i: item index (null for an empty category's drop target)} for a sortable or drop id
  const locate = (all, dragId) => {
    for (const [key, gs] of Object.entries(all))
      for (const [gi, g] of gs.entries()) {
        if (dropId(g.key) === dragId) return { key, gi, i: null };
        const i = g.items.findIndex((it) => it.key === dragId);
        if (i >= 0) return { key, gi, i };
      }
    return null;
  };
  // While dragging, the item moves into the category it is over
  const onDragOver = ({ active, over }) => {
    if (!over) return;
    setGroups((all) => {
      const from = locate(all, active.id);
      const to = locate(all, over.id);
      if (!from || !to || (from.key === to.key && from.gi === to.gi))
        return all;
      const item = all[from.key][from.gi].items[from.i];
      const at = to.i ?? all[to.key][to.gi].items.length;
      const next = { ...all };
      next[from.key] = next[from.key].map((g, j) =>
        j === from.gi
          ? { ...g, items: g.items.filter((it) => it !== item) }
          : g,
      );
      next[to.key] = next[to.key].map((g, j) =>
        j === to.gi
          ? {
              ...g,
              items: [...g.items.slice(0, at), item, ...g.items.slice(at)],
            }
          : g,
      );
      return next;
    });
  };
  const onDragEnd = ({ active, over }) => {
    setDragging(null);
    if (!over) return;
    setGroups((all) => {
      const from = locate(all, active.id);
      const to = locate(all, over.id);
      if (
        !from ||
        !to ||
        to.i === null ||
        from.key !== to.key ||
        from.gi !== to.gi ||
        from.i === to.i
      )
        return all;
      return {
        ...all,
        [from.key]: all[from.key].map((g, j) =>
          j === from.gi ? { ...g, items: arrayMove(g.items, from.i, to.i) } : g,
        ),
      };
    });
  };
  const draggedItem = dragging
    ? Object.values(groups)
        .flat()
        .flatMap((g) => g.items)
        .find((it) => it.key === dragging)
    : null;
  const addItem = (key, gi, at) => {
    const item = { key: newKey(), label: "", matches: "" };
    setSec(key, (gs) =>
      gs.map((g, j) =>
        j === gi
          ? {
              ...g,
              items: [...g.items.slice(0, at), item, ...g.items.slice(at)],
            }
          : g,
      ),
    );
    setFocus(item.key);
  };
  const addGroup = (key) => {
    const item = { key: newKey(), label: "", matches: "" };
    setSec(key, (gs) => [
      ...gs,
      { key: newKey(), cat: "", fresh: true, items: [item] },
    ]);
  };

  // The quiz data to save, or an error message
  const build = () => {
    if (!name.trim()) return "The quiz needs a name.";
    if (name.includes(".")) return "The name can't contain a full stop.";
    const out = { ...d, name: name.trim(), prompt };
    for (const s of sections) {
      const sec = {};
      for (const g of groups[s.key]) {
        for (const it of g.items) {
          if (!it.label.trim() && !it.matches.trim()) continue;
          if (!it.label.trim()) return `${s.name}: an item has no text.`;
          const keywords = toKeywords(it.matches);
          if (!keywords) return `${s.name}: "${it.label}" needs matches.`;
          try {
            rx(keywords);
          } catch {
            return `${s.name}: the matches for "${it.label}" aren't valid.`;
          }
          (sec[g.cat.trim()] ||= []).push({ label: it.label.trim(), keywords });
        }
      }
      out[s.key] = sec;
    }
    return out;
  };

  const save = async (e) => {
    e.preventDefault();
    const data = build();
    if (typeof data === "string") return setMsg(data);
    setBusy(true);
    setMsg("");
    try {
      await saveQuiz(id, data);
      onDone();
    } catch (err) {
      setMsg("Could not save: " + err.message);
      setBusy(false);
    }
  };

  return (
    <section className="home">
      <form className="pledit qe" onSubmit={save} noValidate>
        <div className="segmented" role="tablist">
          {[
            ["manual", "Manual"],
            ["agentic", "Agentic"],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "agentic" ? (
          <p className="note">Agentic editing is coming soon.</p>
        ) : (
          <>
            <div className="qe-card qe-details">
              <label className="lbl" htmlFor="qe-name">
                Name
              </label>
              <input
                id="qe-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <label className="lbl" htmlFor="qe-prompt">
                Prompt
              </label>
              <input
                id="qe-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <p className="note" style={{ margin: 0 }}>
                Renaming an item, or moving it to another section, clears
                anyone's saved progress for it.
              </p>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={({ active }) => setDragging(active.id)}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDragCancel={() => setDragging(null)}
            >
              {sections.map((s) => (
                <div key={s.key} className="qe-section">
                  <h3 className="qe-title">{s.name}</h3>
                  <div className="qe-card">
                    {groups[s.key].map((g, gi) => (
                      <Group
                        key={g.key}
                        group={g}
                        index={gi}
                        count={groups[s.key].length}
                        onMove={(d) => moveGroup(s.key, gi, d)}
                        set={(next) => setGroup(s.key, gi, next)}
                        remove={(i) => removeItem(s.key, gi, i)}
                        removeGroup={() => removeGroup(s.key, gi)}
                        addItem={(at) => addItem(s.key, gi, at)}
                      />
                    ))}
                    <div className="qe-addcat">
                      <button
                        type="button"
                        className="subbtn"
                        onClick={() => addGroup(s.key)}
                      >
                        <PlusIcon />
                        New category
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <DragOverlay>
                {draggedItem && <ItemRow it={draggedItem} overlay />}
              </DragOverlay>
            </DndContext>
          </>
        )}
        {msg && (
          <div className="qe-error" role="alert">
            <strong>Errors</strong>
            <span>{msg}</span>
          </div>
        )}
        <div className="big">
          <button
            className="primary"
            type="submit"
            disabled={busy || tab !== "manual"}
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
