import { useState } from "react";
import { useRowMenu, useStart } from "../lib/useDrillUi";
import { useAccount } from "../state/AccountContext";
import DrillActions from "./DrillActions";

const ChevronIcon = ({ open }) => (
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
    <path d={open ? "m6 9 6 6 6-6" : "m9 6 6 6-6 6"} />
  </svg>
);

// One attempt: its score and date, and a pop-up menu with only Redo incorrect and Clear attempt
function Card({ drill, sv, attempt }) {
  const start = useStart(drill);
  const { ref, open, side, place, rowProps } = useRowMenu();
  return (
    <div
      ref={ref}
      className={"cell" + (open ? " open" : "")}
      onMouseEnter={place}
    >
      <div className="hrow qh-card" {...rowProps}>
        <span className="bdg">{attempt.score}%</span>
        <span className="meta">{new Date(attempt.t).toLocaleDateString()}</span>
      </div>
      <div className={"menu" + (side && " " + side)}>
        <div className="mi">
          <DrillActions
            drill={drill}
            sv={sv}
            attempt={attempt}
            labels={["Start from scratch", "Clear attempt"]}
            onStart={start}
            only="redo-clear"
          />
        </div>
      </div>
    </div>
  );
}

// The quiz page's own History: every attempt of this quiz as a grid, newest first. Hidden until its title is clicked; shown for
// signed-in users who have at least one attempt. Sits under the tiles (bottom of the screen when there is room), see .main in the CSS.
export default function QuizHistory({ drill }) {
  const { acct, user } = useAccount();
  const [open, setOpen] = useState(false);
  const sv = acct && user.drills[drill.key];
  if (!sv || !sv.attempts.length) return null;
  const attempts = [...sv.attempts].reverse();
  return (
    <div className="panel qh">
      <button
        className="qe-toggle lbl"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <ChevronIcon open={open} />
        History
        <span className="meta">{attempts.length}</span>
      </button>
      {open && (
        <div className="qh-grid">
          {attempts.map((a) => (
            <Card key={a.t} drill={drill} sv={sv} attempt={a} />
          ))}
        </div>
      )}
    </div>
  );
}
