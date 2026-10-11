import { useRef, useState } from "react";
import { drillFromQuiz, MODES } from "../lib/data";
import { useQuizzesById } from "../lib/content";
import { isQuizId } from "../lib/legacy";
import { useOutsideClose, useStart } from "../lib/useDrillUi";
import { useAccount } from "../state/AccountContext";
import DrillActions from "./DrillActions";

function HistoryRow({ drill, sv }) {
  const start = useStart(drill);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, open, () => setOpen(false));
  const toggle = () => setOpen((o) => !o);
  return (
    <div
      ref={ref}
      className={"hrow" + (open ? " open" : "")}
      tabIndex={0}
      onClick={(e) => !e.target.closest("button") && toggle()}
      onContextMenu={(e) => {
        e.preventDefault();
        setOpen(true);
      }}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <div className="hl1">
        <span className="nm">{drill.name}</span>
        <span className="bdg">{sv.score}%</span>
      </div>
      <div className="hl2">
        <div className="meta">
          {drill.mode === "cond" ? drill.system : MODES[drill.mode].label} ·{" "}
          {new Date(sv.last).toLocaleDateString()}
        </div>
        <div className="acts">
          <DrillActions
            drill={drill}
            sv={sv}
            labels={["Restart", "Delete"]}
            onStart={start}
            noEdit
          />
        </div>
      </div>
    </div>
  );
}

const PAGE = 50;

// ids: only show history for those quizzes (a playlist's); omitted = every quiz. Deleted quizzes never appear.
export default function History({ ids }) {
  const { user } = useAccount();
  const [limit, setLimit] = useState(PAGE);
  const entries = Object.entries(user.drills)
    .filter(([k, v]) => v.runs && isQuizId(k) && (!ids || ids.has(k)))
    .sort((a, b) => b[1].last - a[1].last);
  const shown = entries.slice(0, limit);
  const quizzes = useQuizzesById(shown.map(([k]) => k));
  const rows = shown.flatMap(([k, sv]) => {
    const quiz = quizzes.map.get(k);
    const drill = quiz && drillFromQuiz(quiz);
    return drill && !drill.deleted ? [{ k, sv, drill }] : [];
  });
  return (
    <div className="panel" id="hist">
      <p className="lbl">History</p>
      <div className="hist">
        {rows.map(({ k, sv, drill }) => (
          <HistoryRow key={k} drill={drill} sv={sv} />
        ))}
        {!rows.length && (
          <p className="note" style={{ margin: 0 }}>
            {quizzes.status === "loading" && shown.length
              ? "Loading…"
              : ids
                ? "No history in this playlist yet."
                : "No history yet. Finish a drill from scratch to see it here."}
          </p>
        )}
        {entries.length > limit && (
          <button onClick={() => setLimit(limit + PAGE)}>Show more</button>
        )}
      </div>
    </div>
  );
}
