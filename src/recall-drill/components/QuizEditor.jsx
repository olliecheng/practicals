import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
import { cap } from "../lib/data";
import Segmented from "../../components/Segmented";
import {
  categoryErrors,
  saveQuiz,
  sectionErrors,
  useSettings,
  validateQuiz,
} from "../lib/content";
import ItemCard from "./ItemCard";
import AgenticTab from "./AgenticTab";
import CategoryPicker from "./CategoryPicker";
import PencilIcon from "./PencilIcon";
import PlusIcon from "./PlusIcon";
import TrashIcon from "./TrashIcon";
import { useDialog } from "./Dialog";
import { rx } from "../lib/match";
import { toKeywords, toText } from "../lib/editItem";
import { briefParts } from "../lib/agentBrief";
import { noEnterSubmit } from "../lib/noEnterSubmit";
import { useLeaveGuard } from "../lib/useLeaveGuard";

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

// The category name as heading text. Under it, one row of ↑ Up / ↓ Down buttons moves the whole category, and an Edit button on a second
// row changes the name through the category picker (the name is never typed).
function CategoryHead({ group, n, index, count, onMove, onEdit }) {
  return (
    // It spans the rows of its items, so its height never stretches the first item's row
    <div
      className="qe-head"
      style={{ gridColumn: 1, gridRow: n ? `2 / span ${2 * n}` : "1 / span 2" }}
    >
      <span className="qe-catname">{group.cat || "No category"}</span>
      <span className="qe-catmoves">
        <span className="qe-catarrows">
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
        <button
          type="button"
          className="subbtn"
          aria-label="Change category"
          title="Change category"
          onClick={onEdit}
        >
          <PencilIcon />
          Edit
        </button>
      </span>
    </div>
  );
}

// The quiz editor's item: an ItemCard with a handle on its left that drags it to any place in any category
function ItemRow({ it, row, setItem, remove, overlay }) {
  const { confirm } = useDialog();
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
      onDelete={async () =>
        // An empty item has nothing to lose, so it goes without asking
        (!it.label.trim() && !it.matches.trim()) ||
        (await confirm({
          message: `Delete ${it.label.trim() || "this item"}?`,
          unsafe: "Delete",
        }))
          ? remove()
          : undefined
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
  onEdit,
}) {
  const { confirm } = useDialog();
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
          n={n}
          index={index}
          count={count}
          onMove={onMove}
          onEdit={onEdit}
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
            onClick={async () =>
              (await confirm({
                message: `Delete the category ${group.cat.trim() || ""}?`,
                unsafe: "Delete",
              })) && removeGroup()
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

export default function QuizEditor({ id, quiz, initialTab, onDone, onCancel }) {
  const { confirm } = useDialog();
  const d = quiz.data;
  const [tab, setTab] = useState(
    initialTab === "agentic" ? "agentic" : "manual",
  );
  const [name, setName] = useState(d.name);
  const [base, setBase] = useState(d); // the quiz's data, whose other fields Apply on the Agentic tab can replace
  // The sections in order, [{id, name}]; the id stays put while the name is edited. `groups` holds each section's categories by id.
  const [start] = useState(() =>
    Object.entries(d.items).map(([name, sec]) => ({
      id: newKey(),
      name,
      groups: toGroups(sec),
    })),
  );
  const [sections, setSections] = useState(() =>
    start.map(({ id, name }) => ({ id, name })),
  );
  const [groups, setGroups] = useState(() =>
    Object.fromEntries(start.map((s) => [s.id, s.groups])),
  );
  const [focus, setFocus] = useState(null);
  const [picking, setPicking] = useState(null); // {key: section, gi: index of the category being changed, or null for a new one}
  const settings = useSettings();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(""); // problems, one per line
  const [ok, setOk] = useState(""); // the Agentic tab's "Valid: ..." note
  const [agentText, setAgentText] = useState(""); // the JSON pasted on the Agentic tab
  // Unsaved changes: the editable state now against how it was on opening (the section ids are stable, so the comparison is exact)
  const snapshot = JSON.stringify({ name, sections, groups });
  const opened = useRef(snapshot);
  const guard = useLeaveGuard(
    snapshot !== opened.current || !!agentText.trim(),
  );

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

  // Sections: rename, move up (-1) or down (1), add (blank, at the end) and delete (only offered when it has no categories)
  // Names are stored lowercase and shown with the first letter capitalised (as the game does)
  const renameSection = (id, name) =>
    setSections((ss) =>
      ss.map((s) => (s.id === id ? { ...s, name: name.toLowerCase() } : s)),
    );
  // For a section's name input: capitalising the shown text makes React reset the caret, so put it back
  const renameFromInput = (id, { target }) => {
    const caret = target.selectionStart;
    renameSection(id, target.value);
    requestAnimationFrame(() => target.setSelectionRange(caret, caret));
  };
  const moveSection = (i, by) => setSections((ss) => arrayMove(ss, i, i + by));
  const addSection = () => {
    const sec = { id: newKey(), name: "" };
    setSections((ss) => [...ss, sec]);
    setGroups((g) => ({ ...g, [sec.id]: [] }));
    setFocus(sec.id);
  };
  const removeSection = (id) => {
    setSections((ss) => ss.filter((s) => s.id !== id));
    setGroups(({ [id]: _, ...rest }) => rest);
  };

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
  const addGroup = (key, cat) => {
    const item = { key: newKey(), label: "", matches: "" };
    setSec(key, (gs) => [...gs, { key: newKey(), cat, items: [item] }]);
    setFocus(item.key);
  };

  // The quiz data to save, or an error message
  const build = () => {
    if (!name.trim()) return "The quiz needs a name.";
    if (name.includes(".")) return "The name can't contain a full stop.";
    if (!sections.length) return "The quiz needs at least one section.";
    const seen = new Set();
    for (const s of sections) {
      const n = s.name.trim().toLowerCase();
      if (!n) return "Every section needs a name.";
      if (seen.has(n.toLowerCase()))
        return `Two sections are called "${cap(n)}"; give them different names.`;
      seen.add(n.toLowerCase());
    }
    const out = { ...base, name: name.trim(), items: {} };
    for (const s of sections) {
      const n = s.name.trim().toLowerCase();
      const sec = {};
      for (const g of groups[s.id]) {
        for (const it of g.items) {
          if (!it.label.trim() && !it.matches.trim()) continue;
          if (!it.label.trim()) return `${n}: an item has no text.`;
          const keywords = toKeywords(it.matches);
          if (!keywords) return `${n}: "${it.label}" needs matches.`;
          try {
            rx(keywords);
          } catch {
            return `${n}: the matches for "${it.label}" aren't valid.`;
          }
          (sec[g.cat.trim()] ||= []).push({ label: it.label.trim(), keywords });
        }
      }
      out.items[n] = sec;
    }
    return out;
  };

  // The quiz as it is now (the Manual tab's and the Agentic tab's section edits included), for the Agentic tab's brief.
  // While the quiz can't be built (a section has no name...) `problem` says why and there is no `current`.
  const { current, problem } = useMemo(() => {
    if (tab !== "agentic") return {};
    const built = build();
    if (typeof built === "string") return { problem: built };
    return { current: built };
  }, [tab, name, sections, groups]);

  // The sections the quiz has now, which the Agentic tab must keep
  const currentSections = current ? Object.keys(current.items) : [];

  // The pasted JSON as an object, or null after showing why it can't be one
  const parseAgentic = () => {
    try {
      const data = JSON.parse(agentText);
      if (data && typeof data === "object" && !Array.isArray(data)) return data;
      setMsg("The quiz must be a single JSON object ({ ... }).");
    } catch (err) {
      setMsg("This isn't valid JSON: " + err.message);
    }
    return null;
  };

  // The server's problems (one per line), else a general message
  const failure = (err, what) =>
    err.errors?.length
      ? err.errors.join("\n")
      : `Could not ${what}: ${err.message}`;

  // The Agentic tab (Validate and Apply) keeps to the Settings categories (the server doesn't check them, and the Manual tab allows custom ones) and to the
  // quiz's sections (added, renamed or dropped ones are for the Manual tab). Shows the problems and returns false when the pasted quiz breaks either.
  const agentOk = (data) => {
    if (problem) {
      setMsg(problem);
      return false;
    }
    if (!settings.data) {
      setMsg("The category list hasn't loaded yet; try again in a moment.");
      return false;
    }
    const errors = [
      ...sectionErrors(data, currentSections),
      ...categoryErrors(data, settings.data.categories),
    ];
    if (errors.length) setMsg(errors.join("\n"));
    return !errors.length;
  };

  // Validate (Agentic tab): checks the categories here and the rest on the server, nothing is saved
  const validate = async () => {
    setOk("");
    setMsg("");
    const data = parseAgentic();
    if (!data || !agentOk(data)) return;
    setBusy(true);
    try {
      const r = await validateQuiz(data);
      if (r.ok) setOk(`Valid: ${r.summary}.`);
      else setMsg(r.errors.join("\n"));
    } catch (err) {
      setMsg(failure(err, "validate"));
    }
    setBusy(false);
  };

  // Apply (Agentic tab): checks the pasted JSON like Validate, then loads it into the Manual tab's state and goes there; nothing is saved yet.
  // Sections keep their ids by name, so they stay the same sections.
  // The button stays enabled so that pressing it with nothing pasted says what is missing.
  const apply = async () => {
    if (!agentText.trim()) return setMsg("JSON text box is empty.");
    const data = parseAgentic();
    if (!data || !agentOk(data)) return;
    setBusy(true);
    try {
      const r = await validateQuiz(data);
      if (!r.ok) setMsg(r.errors.join("\n"));
      else {
        const ids = new Map(
          sections.map((s) => [s.name.trim().toLowerCase(), s.id]),
        );
        const used = new Set();
        const next = Object.entries(data.items).map(([n, sec]) => {
          let id = ids.get(n.trim().toLowerCase());
          if (!id || used.has(id)) id = newKey();
          used.add(id);
          return { id, name: n, groups: toGroups(sec) };
        });
        setName(data.name);
        setBase(data);
        setSections(next.map(({ id, name }) => ({ id, name })));
        setGroups(Object.fromEntries(next.map((s) => [s.id, s.groups])));
        setAgentText("");
        setTab("manual");
        setOk(
          `Applied: ${r.summary}. Review the changes, then press Save to keep them.`,
        );
      }
    } catch (err) {
      setMsg(failure(err, "apply"));
    }
    setBusy(false);
  };

  // Save the Manual tab's state (the Agentic tab's button is Apply, which saves nothing); the server checks the quiz
  const save = async (e) => {
    e.preventDefault();
    setOk("");
    setMsg("");
    if (tab === "agentic") return apply();
    const data = build();
    if (typeof data === "string") return setMsg(data);
    setBusy(true);
    try {
      await saveQuiz(id, data);
      guard.bypass();
      onDone();
    } catch (err) {
      setMsg(failure(err, "save"));
      setBusy(false);
    }
  };

  // The picker's names already used by the section's other categories (lowercase; the one being changed may keep its own)
  const taken = picking
    ? groups[picking.key]
        .filter((_, j) => j !== picking.gi)
        .map((g) => g.cat.trim().toLowerCase())
    : [];

  return (
    <section className="home">
      <form
        className="pledit qe"
        onSubmit={save}
        onKeyDown={noEnterSubmit}
        noValidate
      >
        <div className="qe-back">
          <button
            type="button"
            className="subbtn"
            onClick={() => guard.leave(onCancel)}
          >
            ← Back to quiz
          </button>
        </div>
        <h2 className="qe-pagetitle qe-namehead">
          <span className="qe-pagesub">Edit quiz:</span>
          {/* The wrapper's ::after repeats the text invisibly, so the input is as wide as the name */}
          <span className="qe-pagename" data-value={name || "Quiz name"}>
            <input
              value={name}
              placeholder="Quiz name"
              aria-label="Quiz name"
              onChange={(e) => setName(e.target.value)}
            />
          </span>
        </h2>
        <Segmented
          tabs={[
            ["manual", "Manual"],
            ["agentic", "Agentic"],
          ]}
          value={tab}
          onChange={(k) => {
            setTab(k);
            setMsg("");
            setOk("");
          }}
        />
        {tab === "agentic" ? (
          <AgenticTab
            parts={
              settings.status === "ok" && current
                ? briefParts({
                    prompt: settings.data.agentQuizPrompt,
                    example: settings.data.agentQuizExample,
                    categories: settings.data.categories,
                    sections: currentSections,
                    quiz: current,
                  })
                : null
            }
            problem={problem}
            sections={sections.map((s) => ({
              ...s,
              empty: !groups[s.id].length,
            }))}
            onRename={renameFromInput}
            onAdd={addSection}
            onRemove={removeSection}
            text={agentText}
            setText={setAgentText}
            busy={busy}
          />
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={({ active }) => setDragging(active.id)}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDragCancel={() => setDragging(null)}
            >
              {sections.map((s, si) => (
                <div key={s.id} className="qe-section">
                  <div className="qe-sechead">
                    <input
                      className="qe-sectitle"
                      value={cap(s.name)}
                      placeholder="Section name"
                      aria-label="Section name"
                      data-id={s.id}
                      onChange={(e) => renameFromInput(s.id, e)}
                    />
                    {si > 0 && (
                      <button
                        type="button"
                        className="subbtn"
                        aria-label="Move section up"
                        title="Move section up"
                        onClick={() => moveSection(si, -1)}
                      >
                        ↑ Up
                      </button>
                    )}
                    {si < sections.length - 1 && (
                      <button
                        type="button"
                        className="subbtn"
                        aria-label="Move section down"
                        title="Move section down"
                        onClick={() => moveSection(si, 1)}
                      >
                        ↓ Down
                      </button>
                    )}
                  </div>
                  <div className="qe-card">
                    {groups[s.id].map((g, gi) => (
                      <Group
                        key={g.key}
                        group={g}
                        index={gi}
                        count={groups[s.id].length}
                        onMove={(d) => moveGroup(s.id, gi, d)}
                        onEdit={() => setPicking({ key: s.id, gi })}
                        set={(next) => setGroup(s.id, gi, next)}
                        remove={(i) => removeItem(s.id, gi, i)}
                        removeGroup={() => removeGroup(s.id, gi)}
                        addItem={(at) => addItem(s.id, gi, at)}
                      />
                    ))}
                    <div className="qe-addcat">
                      <button
                        type="button"
                        className="subbtn"
                        onClick={() => setPicking({ key: s.id, gi: null })}
                      >
                        <PlusIcon />
                        New category
                      </button>
                      {!groups[s.id].length && (
                        <button
                          type="button"
                          className="subbtn danger"
                          onClick={async () =>
                            (await confirm({
                              message: `Delete the section ${cap(s.name.trim()) || "(unnamed)"}?`,
                              unsafe: "Delete",
                            })) && removeSection(s.id)
                          }
                        >
                          <TrashIcon />
                          Delete section
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <DragOverlay>
                {draggedItem && <ItemRow it={draggedItem} overlay />}
              </DragOverlay>
            </DndContext>
            <div className="qe-addsec">
              <button type="button" className="subbtn" onClick={addSection}>
                <PlusIcon />
                Add section
              </button>
            </div>
          </>
        )}
        {picking && (
          <CategoryPicker
            status={settings.status}
            // Names not used by another category of the section (the one being changed keeps its own)
            categories={(settings.data?.categories ?? []).filter(
              (c) => !taken.includes(c.toLowerCase()),
            )}
            taken={taken}
            current={
              picking.gi === null
                ? null
                : groups[picking.key][picking.gi].cat.trim()
            }
            confirmLabel={picking.gi === null ? "Add" : "Edit"}
            onPick={(cat) => {
              if (picking.gi === null) addGroup(picking.key, cat);
              else
                setGroup(picking.key, picking.gi, {
                  ...groups[picking.key][picking.gi],
                  cat,
                });
              setPicking(null);
            }}
            onClose={() => setPicking(null)}
          />
        )}
        {msg && (
          <div className="qe-error" role="alert">
            <strong>Errors</strong>
            <span>{msg}</span>
          </div>
        )}
        {ok && (
          <div className="qe-ok" role="status">
            {ok}
          </div>
        )}
        <div className="big">
          {tab === "agentic" && (
            <button
              type="button"
              disabled={busy || !agentText.trim()}
              onClick={validate}
            >
              Validate
            </button>
          )}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "Working…" : tab === "agentic" ? "Apply" : "Save"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => guard.leave(onCancel)}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
