import { useEffect, useRef, useState } from "react";
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
import { cap, drillFromQuiz } from "../lib/data";
import { deleteQuiz, savePlaylist } from "../lib/content";
import PlusIcon from "./PlusIcon";
import TrashIcon from "./TrashIcon";
import { useDialog } from "./Dialog";
import { noEnterSubmit } from "../lib/noEnterSubmit";
import { useLeaveGuard } from "../lib/useLeaveGuard";

let nextKey = 0;
const newKey = () => "s" + nextKey++;
const secDrop = (key) => "sec:" + key;

// Local copy of the playlist: [{key, title, items:[{id, name, deleted}]}]; quizzes that can't be read are kept by id
const fromPlaylist = (pl) =>
  pl.sections.map((s) => ({
    key: newKey(),
    title: s.title,
    items: s.quizzes.map((q) => {
      const d = drillFromQuiz(q);
      return {
        id: q.id,
        name: d ? d.name : q.id,
        deleted: !!q.deleted,
      };
    }),
  }));

// onDelete: the Delete button, shown on hover (not in the drag overlay)
function Item({ item, overlay, onDelete }) {
  const s = useSortable({ id: item.id, disabled: overlay });
  const style = overlay
    ? undefined
    : {
        transform: CSS.Transform.toString(s.transform),
        transition: s.transition,
      };
  return (
    <div
      ref={overlay ? undefined : s.setNodeRef}
      style={style}
      className={
        "edrow" +
        (item.deleted ? " gone" : "") +
        (s.isDragging ? " dragging" : "") +
        (overlay ? " eddrag" : "")
      }
    >
      <button
        type="button"
        className="edhandle"
        aria-label={`Drag ${item.name}`}
        title="Drag to reorder"
        ref={overlay ? undefined : s.setActivatorNodeRef}
        {...(overlay ? {} : { ...s.attributes, ...s.listeners })}
      >
        ⋮⋮
      </button>
      <span className="lb">
        {item.name}
        {item.deleted && <em> (deleted)</em>}
      </span>
      {!overlay && (
        <button
          type="button"
          className="subbtn danger rowdel"
          aria-label={`Delete ${item.name}`}
          onClick={() => onDelete(item)}
        >
          <TrashIcon />
          Delete
        </button>
      )}
    </div>
  );
}

// One row of the new quiz template: a drag handle, the section's name and Delete
function TemplateRow({ d, onRename, onDelete }) {
  const s = useSortable({ id: d.key });
  const style = {
    transform: CSS.Transform.toString(s.transform),
    transition: s.transition,
  };
  return (
    <div
      ref={s.setNodeRef}
      style={style}
      className={"defsec" + (s.isDragging ? " dragging" : "")}
    >
      <button
        type="button"
        className="edhandle"
        aria-label={`Drag ${d.name || "section"}`}
        title="Drag to reorder"
        ref={s.setActivatorNodeRef}
        {...s.attributes}
        {...s.listeners}
      >
        ⋮⋮
      </button>
      <input
        value={cap(d.name)}
        placeholder="Section name"
        aria-label="Template section name"
        data-id={d.key}
        onChange={(e) => {
          // Capitalising the shown text makes React reset the caret, so put it back
          const { target } = e;
          const caret = target.selectionStart;
          onRename(d.key, target.value);
          requestAnimationFrame(() => target.setSelectionRange(caret, caret));
        }}
      />
      <button
        type="button"
        className="subbtn danger"
        aria-label={`Delete ${d.name || "section"}`}
        onClick={() => onDelete(d.key)}
      >
        <TrashIcon />
        Delete
      </button>
    </div>
  );
}

function Section({ sec, index, count, set, onMove, onDelete }) {
  // An empty section has no rows to drop on, so the list itself is a drop target
  const { setNodeRef } = useDroppable({ id: secDrop(sec.key) });
  return (
    <div className="edsection">
      <div className="edhead">
        <input
          className="edtitle"
          value={sec.title}
          placeholder="Section title"
          aria-label="Section title"
          onChange={(e) => set({ ...sec, title: e.target.value })}
        />
        {index > 0 && (
          <button
            type="button"
            className="subbtn"
            aria-label="Move section up"
            onClick={() => onMove(-1)}
          >
            ↑ Up
          </button>
        )}
        {index < count - 1 && (
          <button
            type="button"
            className="subbtn"
            aria-label="Move section down"
            onClick={() => onMove(1)}
          >
            ↓ Down
          </button>
        )}
      </div>
      <SortableContext
        items={sec.items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="edlist">
          {sec.items.map((it) => (
            <Item key={it.id} item={it} onDelete={onDelete} />
          ))}
          {!sec.items.length && <p className="note">No quizzes</p>}
        </div>
      </SortableContext>
    </div>
  );
}

export default function PlaylistEditor({ id, pl, onDone, onCancel }) {
  const { confirm } = useDialog();
  const [title, setTitle] = useState(pl.title);
  const [description, setDescription] = useState(pl.description);
  const [sections, setSections] = useState(() => fromPlaylist(pl));
  // The default sections for new quizzes: [{key, name}]. They are only stored here; quizzes that already exist keep their own sections.
  const [defaults, setDefaults] = useState(() =>
    (pl.quiz_settings?.sections ?? []).map((name) => ({
      key: newKey(),
      name: name.toLowerCase(),
    })),
  );
  const [focus, setFocus] = useState(null);
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  // Quizzes taken out of the playlist with Delete, [{id, name, deleted}]; they are deleted when Save is pressed
  const [removed, setRemoved] = useState([]);
  // Unsaved changes: the editable state now against how it was on opening (rows taken out with Delete count until Save)
  const snapshot = JSON.stringify({ title, description, sections, defaults });
  const opened = useRef(snapshot);
  const guard = useLeaveGuard(
    snapshot !== opened.current || removed.length > 0,
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // The section holding a sortable id, or the section a "sec:" drop target stands for
  const findSection = (secs, dragId) =>
    secs.find(
      (s) => secDrop(s.key) === dragId || s.items.some((i) => i.id === dragId),
    );

  const setSection = (key, next) =>
    setSections((ss) => ss.map((s) => (s.key === key ? next : s)));

  // Moves the dragged row into the section it is over, so rows can cross sections while dragging
  const onDragOver = ({ active, over }) => {
    if (!over) return;
    setSections((ss) => {
      const from = findSection(ss, active.id);
      const to = findSection(ss, over.id);
      if (!from || !to || from === to) return ss;
      const item = from.items.find((i) => i.id === active.id);
      const overIndex = to.items.findIndex((i) => i.id === over.id);
      const at = overIndex < 0 ? to.items.length : overIndex;
      return ss.map((s) =>
        s === from
          ? { ...s, items: s.items.filter((i) => i !== item) }
          : s === to
            ? {
                ...s,
                items: [...s.items.slice(0, at), item, ...s.items.slice(at)],
              }
            : s,
      );
    });
  };

  const onDragEnd = ({ active, over }) => {
    setActive(null);
    if (!over) return;
    setSections((ss) => {
      const sec = findSection(ss, active.id);
      const from = sec?.items.findIndex((i) => i.id === active.id);
      const to = sec?.items.findIndex((i) => i.id === over.id);
      if (!sec || from < 0 || to < 0 || from === to) return ss;
      return ss.map((s) =>
        s === sec ? { ...s, items: arrayMove(s.items, from, to) } : s,
      );
    });
  };

  // A new default section takes the cursor once it is on the page
  useEffect(() => {
    if (!focus) return;
    document.querySelector(`[data-id="${focus}"]`)?.focus();
    setFocus(null);
  }, [focus]);

  // Names are stored lowercase (as quiz sections are) and shown with the first letter capitalised
  const setDefault = (key, name) =>
    setDefaults((ds) =>
      ds.map((d) => (d.key === key ? { ...d, name: name.toLowerCase() } : d)),
    );
  // The template has its own drag and drop (the rows only reorder; they never leave the list)
  const onTemplateDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setDefaults((ds) =>
      arrayMove(
        ds,
        ds.findIndex((d) => d.key === active.id),
        ds.findIndex((d) => d.key === over.id),
      ),
    );
  };

  // Delete on a row: after a confirm, the quiz leaves the list now and is deleted by Save (Cancel brings it back)
  const removeQuiz = async (secKey, item) => {
    if (
      !(await confirm({
        message: item.deleted
          ? `Remove ${item.name} from this playlist? It is already deleted.`
          : `Delete ${item.name}? It will be removed from this playlist and deleted.`,
        unsafe: item.deleted ? "Remove" : "Delete",
      }))
    )
      return;
    setSections((ss) =>
      ss.map((s) =>
        s.key === secKey
          ? { ...s, items: s.items.filter((i) => i.id !== item.id) }
          : s,
      ),
    );
    setRemoved((r) => [...r, item]);
  };

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    // Blank rows are dropped; the names must be unique (any case), as the server checks
    const names = defaults
      .map((d) => d.name.trim().toLowerCase())
      .filter(Boolean);
    if (new Set(names.map((n) => n.toLowerCase())).size < names.length)
      return setMsg("The default sections must have different names.");
    setBusy(true);
    try {
      await savePlaylist(id, {
        title: title.trim(),
        description,
        quiz_settings: { sections: names },
        sections: sections.map((s) => ({
          title: s.title.trim(),
          quiz_ids: s.items.map((i) => i.id),
        })),
      });
      // The playlist is saved; now delete the quizzes taken out of it (any left from an earlier attempt are retried by pressing Save again)
      const failed = [];
      for (const q of removed) {
        if (q.deleted) continue;
        try {
          await deleteQuiz(q.id);
        } catch (err) {
          failed.push({ q, err });
        }
      }
      if (failed.length) {
        setRemoved(failed.map((f) => f.q));
        setMsg(
          `Saved, but couldn't delete ${failed.map((f) => f.q.name).join(", ")}: ${failed[0].err.message}`,
        );
        setBusy(false);
        return;
      }
      guard.bypass();
      onDone();
    } catch (err) {
      setMsg("Could not save: " + err.message);
      setBusy(false);
    }
  };

  const activeItem = active
    ? sections.flatMap((s) => s.items).find((i) => i.id === active)
    : null;

  return (
    <form
      className="pledit"
      onSubmit={save}
      onKeyDown={noEnterSubmit}
      noValidate
    >
      <h2 className="qe-pagetitle">
        Edit playlist: {title.trim() || pl.title}
      </h2>
      <div className="qe-card qe-details">
        <label className="lbl" htmlFor="pl-title">
          Title
        </label>
        <input
          id="pl-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label className="lbl" htmlFor="pl-desc">
          Description
        </label>
        <textarea
          id="pl-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="qe-section">
        <h3 className="qe-title">New quiz template</h3>
        <div className="qe-card qe-details">
          <p className="note" style={{ margin: 0 }}>
            This is a template for the sections that new quizzes in this
            playlist will start with. Changing it doesn't change quizzes that
            already exist.
          </p>
          <div className="defsecs">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onTemplateDragEnd}
            >
              <SortableContext
                items={defaults.map((d) => d.key)}
                strategy={verticalListSortingStrategy}
              >
                {defaults.map((d) => (
                  <TemplateRow
                    key={d.key}
                    d={d}
                    onRename={setDefault}
                    onDelete={(key) =>
                      setDefaults((ds) => ds.filter((x) => x.key !== key))
                    }
                  />
                ))}
              </SortableContext>
            </DndContext>
            {!defaults.length && (
              <p className="note">The template has no sections.</p>
            )}
          </div>
          <div>
            <button
              type="button"
              className="subbtn"
              onClick={() => {
                const key = newKey();
                setDefaults((ds) => [...ds, { key, name: "" }]);
                setFocus(key);
              }}
            >
              <PlusIcon />
              Add section
            </button>
          </div>
        </div>
      </div>
      <div className="qe-section">
        <h3 className="qe-title">Sections</h3>
        <div className="qe-card">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={({ active }) => setActive(active.id)}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={() => setActive(null)}
          >
            {sections.map((sec, i) => (
              <Section
                key={sec.key}
                sec={sec}
                index={i}
                count={sections.length}
                set={(next) => setSection(sec.key, next)}
                onMove={(d) => setSections((ss) => arrayMove(ss, i, i + d))}
                onDelete={(item) => removeQuiz(sec.key, item)}
              />
            ))}
            <DragOverlay>
              {activeItem && <Item item={activeItem} overlay />}
            </DragOverlay>
          </DndContext>
          <div className="big">
            <button
              type="button"
              onClick={() =>
                setSections((ss) => [
                  ...ss,
                  { key: newKey(), title: "", items: [] },
                ])
              }
            >
              Add section
            </button>
          </div>
        </div>
      </div>
      {msg && (
        <p className="msg" role="alert">
          {msg}
        </p>
      )}
      <div className="big">
        <button className="primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
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
  );
}
