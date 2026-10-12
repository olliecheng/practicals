import { useState } from "react";
import { drillFromQuiz } from "../lib/data";
import { useQuizzesById } from "../lib/content";
import { isQuizId } from "../lib/legacy";
import { useRowMenu, useStart } from "../lib/useDrillUi";
import { useAccount } from "../state/AccountContext";
import DrillActions from "./DrillActions";

// The same row and pop-up menu as the quiz list (Start from scratch, Redo incorrect, Reset progress, Edit), without Star
function HistoryRow({ drill, sv }) {
  const start = useStart(drill);
  const { ref, open, left, place, rowProps } = useRowMenu();
  return (
    <div
      ref={ref}
      className={"cell" + (open ? " open" : "")}
      onMouseEnter={place}
    >
      <div className="hrow" {...rowProps}>
        <div className="hl1">
          <span className="nm">{drill.name}</span>
          <span className="bdg">{sv.score}%</span>
        </div>
        <div className="meta">{new Date(sv.last).toLocaleDateString()}</div>
      </div>
      <div className={"menu" + (left ? " l" : "")}>
        <div className="mi">
          <DrillActions
            drill={drill}
            sv={sv}
            labels={["Start from scratch", "Reset progress"]}
            onStart={start}
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
