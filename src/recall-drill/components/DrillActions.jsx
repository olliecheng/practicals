import { useNavigate } from "react-router-dom";
import { useAccount } from "../state/AccountContext";
import { drillPath } from "../lib/legacy";
import PencilIcon from "./PencilIcon";
import { useDialog } from "./Dialog";
import { syncLatest } from "../lib/storage";

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

// The quiz's menu entries, shared by the list popover and the history panels: "Start quiz" for a quiz with no saved history (sv
// undefined), otherwise Start from scratch / Redo incorrect / Clear attempt; then Edit for signed-in users. Clear attempt removes one
// attempt (keeping ignored items and the star). `attempt` is the attempt the menu is for (default: the latest, as in the list popover);
// Redo incorrect redoes that attempt's answers. `star` adds Star / Unstar. `only` ("redo-clear") leaves just Redo incorrect and Clear attempt
// (the quiz page's own history). They are .subbtn buttons (icon and small label), see DESIGN.md.
export default function DrillActions({
  drill,
  sv,
  attempt,
  labels,
  onStart,
  star,
  only,
}) {
  const { mutate, acct, user, toggleStar, canEdit } = useAccount();
  const nav = useNavigate();
  const { confirm } = useDialog();
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
  const edit = canEdit && !only && (
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
  // A record can exist without attempts (ignored tiles only, or every attempt cleared): then there is nothing to clear
  const at = attempt || sv.attempts[sv.attempts.length - 1] || sv;
  const known = new Set([...at.found, ...at.credited, ...sv.ignored]);
  const hasBlanks = drill.items.some((it) => !known.has(it.key));
  const clearAttempt = async () => {
    if (
      !(await confirm({
        message: `Clear this attempt of ${drill.name}?`,
        unsafe: "Clear attempt",
      }))
    )
      return;
    mutate(() => {
      sv.attempts = sv.attempts.filter((a) => a.t !== at.t);
      syncLatest(sv);
    });
  };
  return (
    <>
      {!only && (
        <button
          className="subbtn ok"
          title="Start from scratch"
          onClick={() => onStart(false)}
        >
          <PlayIcon />
          {labels[0]}
        </button>
      )}
      <button
        className="subbtn bad"
        disabled={!hasBlanks}
        title={
          hasBlanks
            ? "Keep your correct answers filled in; fill the rest"
            : "Nothing incorrect to redo"
        }
        onClick={() => onStart(true, attempt)}
      >
        <RedoIcon />
        Redo incorrect
      </button>
      {starBtn}
      {sv.attempts.length > 0 && (
        <button
          className="subbtn"
          title="Remove this attempt from your history"
          onClick={clearAttempt}
        >
          <TrashIcon />
          {labels[1]}
        </button>
      )}
      {edit}
    </>
  );
}
