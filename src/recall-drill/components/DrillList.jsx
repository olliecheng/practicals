import { useRef, useState } from "react";
import { useAccount } from "../state/AccountContext";
import { useOutsideClose, useStart } from "../lib/useDrillUi";
import DrillActions from "./DrillActions";

export function Row({ drill }) {
  const { acct, user, toggleStar } = useAccount();
  const start = useStart(drill);
  const sv = acct && user.drills[drill.key],
    hist = !!(sv && sv.runs),
    starred = !!acct && user.stars.includes(drill.key);
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, open, () => setOpen(false));
  // Open the popover to the right of the cell, or to the left if it wouldn't fit in the viewport
  const place = () =>
    ref.current &&
    setLeft(
      ref.current.getBoundingClientRect().right + 170 >
        document.documentElement.clientWidth,
    );
  // With history, clicking opens the options popover (it also shows on hover); otherwise start straight away.
  const click = () => {
    if (!hist) return start();
    setOpen((o) => !o);
    place();
  };
  return (
    <div
      ref={ref}
      className={"cell" + (open ? " open" : "")}
      onMouseEnter={acct ? place : undefined}
    >
      <div
        className="rw"
        tabIndex={0}
        role="button"
        onClick={click}
        onContextMenu={
          acct
            ? (e) => {
                e.preventDefault();
                setOpen(true);
                place();
              }
            : undefined
        }
        onKeyDown={(e) => {
          if (
            e.target === e.currentTarget &&
            (e.key === "Enter" || e.key === " ")
          ) {
            e.preventDefault();
            click();
          }
        }}
      >
        <span className="lb">{drill.name}</span>
        {acct && (
          <button
            className="rstar"
            aria-pressed={starred}
            title={starred ? "Unstar" : "Star this drill"}
            aria-label={starred ? "Unstar" : "Star this drill"}
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(drill.key);
            }}
          >
            ★
          </button>
        )}
        {hist && (
          <span
            className="bdg"
            title={`Done ${sv.runs}×, last ${new Date(sv.last).toLocaleDateString()}`}
          >
            {sv.score}%
          </span>
        )}
      </div>
      {acct && (
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
      )}
    </div>
  );
}

// condlist is a grid and the system headings span it, so the group is a fragment rather than a wrapper element
export const Group = ({ system, drills }) => (
  <>
    {system && <h3 className="sysh">{system}</h3>}
    {drills.map((d) => (
      <Row key={d.key} drill={d} />
    ))}
  </>
);
