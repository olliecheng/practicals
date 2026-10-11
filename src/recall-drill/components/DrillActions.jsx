import { useNavigate } from "react-router-dom";
import { useAccount } from "../state/AccountContext";
import { drillPath } from "../lib/legacy";
import PencilIcon from "./PencilIcon";

// 16px outline icons (see DESIGN.md)
const Icon = ({ d }) => (
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
    <path d={d} />
  </svg>
);
const StarIcon = ({ filled }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1Z" />
  </svg>
);
const PlayIcon = () => <Icon d="M6 4l14 8-14 8Z" />;
const RedoIcon = () => <Icon d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />;
const TrashIcon = () => (
  <Icon d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
);

// The quiz's menu entries, shared by the list popover and the history panel: "Start quiz" for a quiz with no saved history (sv
// undefined), otherwise Start from scratch / Redo incorrect / clear history; then Edit for signed-in users. Clearing keeps
// ignored items and the star. `star` adds Star / Unstar; `noEdit` leaves Edit out (the history panel). They are .subbtn buttons (icon and small label), see DESIGN.md.
export default function DrillActions({
  drill,
  sv,
  labels,
  onStart,
  star,
  noEdit,
}) {
  const { mutate, acct, user, toggleStar } = useAccount();
  const nav = useNavigate();
  // Star / Unstar (only where `star` is set: the list popover)
  const starred = !!acct && user.stars.includes(drill.key);
  const starBtn = acct && star && (
    <button
      className="subbtn amber"
      title={starred ? "Unstar" : "Star this quiz"}
      onClick={() => toggleStar(drill.key)}
    >
      <StarIcon filled={starred} />
      {starred ? "Unstar" : "Star"}
    </button>
  );
  const edit = acct && !noEdit && (
    <button
      className="subbtn"
      title="Edit this quiz"
      onClick={() => nav(`${drillPath(drill.key)}/edit`)}
    >
      <PencilIcon />
      Edit
    </button>
  );
  if (!sv)
    return (
      <>
        <button
          className="subbtn ok"
          title="Start this quiz"
          onClick={() => onStart(false)}
        >
          <PlayIcon />
          Start quiz
        </button>
        {starBtn}
        {edit}
      </>
    );
  const known = new Set([...sv.found, ...sv.credited, ...sv.ignored]);
  const hasBlanks = drill.items.some((it) => !known.has(it.key));
  const reset = () => {
    if (!confirm(`Clear your history for ${drill.name}?`)) return;
    mutate(() =>
      Object.assign(sv, {
        runs: 0,
        last: 0,
        score: 0,
        found: [],
        credited: [],
      }),
    );
  };
  return (
    <>
      <button
        className="subbtn ok"
        title="Start from scratch"
        onClick={() => onStart(false)}
      >
        <PlayIcon />
        {labels[0]}
      </button>
      <button
        className="subbtn bad"
        disabled={!hasBlanks}
        title={
          hasBlanks
            ? "Keep your correct answers filled in; fill the rest"
            : "Nothing incorrect to redo"
        }
        onClick={() => onStart(true)}
      >
        <RedoIcon />
        Redo incorrect
      </button>
      {starBtn}
      <button className="subbtn" title="Delete from history" onClick={reset}>
        <TrashIcon />
        {labels[1]}
      </button>
      {edit}
    </>
  );
}
