import { useCallback, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { drillFromQuiz } from "../lib/data";
import { saveQuiz, usePlaylist } from "../lib/content";
import { applyToItem, removeItem, updateItem } from "../lib/editItem";
import { drillPath, featuredId, playlistPath } from "../lib/legacy";
import { useTitle } from "../lib/useTitle";
import { useAccount } from "../state/AccountContext";
import { useDialog } from "../components/Dialog";
import RequireEditor from "../components/RequireEditor";
import StepsView from "../components/Steps";
import { ICONS, ItemDialog, TileMenu } from "../components/TileMenu";

const NotFound = ({ children = "Playlist not found" }) => (
  <div className="panel">
    <p className="lbl">{children}</p>
    <p className="note">
      <Link className="link" to="/">
        ← Back to the playlists
      </Link>
    </p>
  </div>
);

export default function Learn() {
  const { id } = useParams();
  const built = featuredId(id);
  if (built) return <Navigate to={`/learn/${built}`} replace />;
  return <LearnView id={id} />;
}

function LearnView({ id }) {
  const st = usePlaylist(id);
  const pl = st.status === "ok" ? st.data : null;
  const { canEdit } = useAccount();
  const { alert, confirm } = useDialog();
  const [menu, setMenu] = useState(null); // {drill, item, x, y}
  const [dialog, setDialog] = useState(null); // {mode, drill, item}
  const [, redraw] = useState(0);
  const closeMenu = useCallback(() => setMenu(null), []);
  const closeDialog = useCallback(() => setDialog(null), []);
  // The stored body of each quiz we changed, so the next save builds on the latest one
  const datas = useRef({});
  const dataOf = (d) =>
    (datas.current[d.key] ??= pl.sections
      .flatMap((s) => s.quizzes)
      .find((q) => q.id === d.key).data);
  const saveItem = async ({ drill, item }, patch) => {
    const data = updateItem(dataOf(drill), item, patch);
    if (!data)
      throw new Error("This item changed in the quiz; reload to edit it.");
    await saveQuiz(drill.key, data);
    datas.current[drill.key] = data;
    applyToItem(item, patch);
    redraw((n) => n + 1);
  };
  const deleteItem = async (drill, item) => {
    if (
      !(await confirm({
        message: "Are you sure you want to delete?",
        unsafe: "Delete",
      }))
    )
      return;
    const data = removeItem(dataOf(drill), item);
    if (!data)
      return alert("This item changed in the quiz; reload to delete it.");
    try {
      await saveQuiz(drill.key, data);
    } catch (e) {
      return alert(e.message || "Could not delete.");
    }
    datas.current[drill.key] = data;
    drill.items.splice(drill.items.indexOf(item), 1);
    redraw((n) => n + 1);
  };
  useTitle(pl && `Learn ${pl.title}`);
  const sections = useMemo(
    () =>
      pl
        ? pl.sections.map((s) => ({
            title: s.title,
            drills: s.quizzes.map(drillFromQuiz).filter((d) => d && !d.deleted),
          }))
        : [],
    [pl],
  );

  if (st.status === "loading") return <p className="note">Loading…</p>;
  if (st.status === "error")
    return st.error?.status === 404 ? (
      <NotFound />
    ) : (
      <NotFound>
        Could not load this playlist. <button onClick={st.retry}>Retry</button>
      </NotFound>
    );

  return (
    <section className="learn">
      <p className="note">
        <Link className="link" to={playlistPath(id)}>
          ← {pl.title}
        </Link>
      </p>
      <div className="learn-body">
        <nav className="learn-toc" aria-label="Contents">
          <h2 className="learn-toc-title">Contents</h2>
          {sections
            .flatMap((s) => s.drills)
            .map((d) => (
              <a
                key={d.key}
                href={"#quiz-" + d.key}
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("quiz-" + d.key)
                    ?.scrollIntoView({ block: "start" });
                }}
              >
                {d.name}
              </a>
            ))}
        </nav>
        <div className="learn-main">
          {sections.map((s, i) =>
            s.drills.length ? (
              <div key={i}>
                {sections.length > 1 && <h2 className="qe-title">{s.title}</h2>}
                {s.drills.map((d) => (
                  <div
                    className="panel learn-quiz"
                    id={"quiz-" + d.key}
                    key={d.key}
                  >
                    <h2 className="pltitle">
                      <Link to={drillPath(d.key)}>{d.name}</Link>
                    </h2>
                    <StepsView
                      drill={d}
                      onMenu={
                        canEdit
                          ? (item, x, y) => setMenu({ drill: d, item, x, y })
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            ) : null,
          )}
        </div>
      </div>
      {menu && (
        <TileMenu
          x={menu.x}
          y={menu.y}
          onClose={closeMenu}
          entries={[
            {
              icon: ICONS.teach,
              label: "Teach new keyword",
              onClick: () => setDialog({ mode: "teach", ...menu }),
            },
            {
              icon: ICONS.edit,
              label: "Edit",
              onClick: () => setDialog({ mode: "edit", ...menu }),
            },
            {
              icon: ICONS.trash,
              label: "Delete",
              danger: true,
              onClick: () => deleteItem(menu.drill, menu.item),
            },
          ]}
        />
      )}
      {dialog && (
        <RequireEditor onDenied={closeDialog}>
          <ItemDialog
            mode={dialog.mode}
            item={dialog.item}
            onSave={(patch) => saveItem(dialog, patch)}
            onClose={closeDialog}
          />
        </RequireEditor>
      )}
    </section>
  );
}
