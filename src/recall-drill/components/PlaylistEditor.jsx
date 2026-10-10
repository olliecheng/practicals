import { useState } from "react";
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
import { drillFromQuiz } from "../lib/data";
import { savePlaylist } from "../lib/content";

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
        deleted: !!(q.deleted ?? q.data?.deleted),
      };
    }),
  }));

function Item({ item, overlay }) {
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
    </div>
  );
}

function Section({ sec, index, count, set, onMove }) {
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
        <button
          type="button"
          className="edicon"
          disabled={index === 0}
          aria-label="Move section up"
          onClick={() => onMove(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="edicon"
          disabled={index === count - 1}
          aria-label="Move section down"
          onClick={() => onMove(1)}
        >
          ↓
        </button>
      </div>
      <SortableContext
        items={sec.items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="edlist">
          {sec.items.map((it) => (
            <Item key={it.id} item={it} />
          ))}
          {!sec.items.length && <p className="note">No quizzes</p>}
        </div>
      </SortableContext>
    </div>
  );
}

export default function PlaylistEditor({ id, pl, onDone, onCancel }) {
  const [title, setTitle] = useState(pl.title);
  const [description, setDescription] = useState(pl.description);
  const [sections, setSections] = useState(() => fromPlaylist(pl));
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
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

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await savePlaylist(id, {
        title: title.trim(),
        description,
        sections: sections.map((s) => ({
          title: s.title.trim(),
          quiz_ids: s.items.map((i) => i.id),
        })),
      });
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
    <form className="pledit" onSubmit={save} noValidate>
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
      <p className="lbl">Sections</p>
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
      {msg && (
        <p className="msg" role="alert">
          {msg}
        </p>
      )}
      <div className="big">
        <button className="primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
