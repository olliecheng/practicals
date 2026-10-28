import { useState } from "react";
import { drillFromQuiz } from "../lib/data";
import { useQuizzesById } from "../lib/content";
import { isQuizId } from "../lib/legacy";
import { useRowMenu, useStart } from "../lib/useDrillUi";
import { useAccount } from "../state/AccountContext";
import DrillActions from "./DrillActions";

// The same row and pop-up menu as the quiz list (Start from scratch, Redo incorrect, Clear attempt, Edit), without Star.
// One row is one attempt, so a quiz can appear more than once.
function HistoryRow({ drill, sv, attempt }) {
  const start = useStart(drill);
  const { ref, open, side, place, rowProps } = useRowMenu();
  return (
    <div
      ref={ref}
      className={"cell" + (open ? " open" : "")}
      onMouseEnter={place}
    >
      <div className="hrow" {...rowProps}>
        <div className="hl1">
          <span className="nm">{drill.name}</span>
          <span className="bdg">{attempt.score}%</span>
        </div>
        <div className="meta">{new Date(attempt.t).toLocaleDateString()}</div>
      </div>
      <div className={"menu" + (side && " " + side)}>
        <div className="mi">
          <DrillActions
            drill={drill}
            sv={sv}
            attempt={attempt}
            labels={["Start from scratch", "Clear attempt"]}
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
    .filter(([k]) => isQuizId(k) && (!ids || ids.has(k)))
    .flatMap(([k, sv]) => sv.attempts.map((attempt) => ({ k, sv, attempt })))
    .sort((a, b) => b.attempt.t - a.attempt.t);
  const shown = entries.slice(0, limit);
  const quizzes = useQuizzesById([...new Set(shown.map((e) => e.k))]);
  const rows = shown.flatMap((e) => {
    const quiz = quizzes.map.get(e.k);
    const drill = quiz && drillFromQuiz(quiz);
    return drill && !drill.deleted ? [{ ...e, drill }] : [];
  });
  return (
    <div className="panel" id="hist">
      <p className="lbl">History</p>
      <div className="hist">
        {rows.map(({ k, sv, attempt, drill }) => (
          <HistoryRow
            key={k + ":" + attempt.t}
            drill={drill}
            sv={sv}
            attempt={attempt}
          />
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
