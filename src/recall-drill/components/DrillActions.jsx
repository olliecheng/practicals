import { useAccount } from "../state/AccountContext";

// Start from scratch / Redo incorrect / clear history for a drill with saved history; shared by the list popover and the history panel.
// Clearing keeps ignored items and the star.
export default function DrillActions({ drill, sv, labels, onStart }) {
  const { mutate } = useAccount();
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
        className="scr"
        title="Start from scratch"
        onClick={() => onStart(false)}
      >
        {labels[0]}
      </button>
      <button
        className="inc"
        disabled={!hasBlanks}
        title={
          hasBlanks
            ? "Keep your correct answers filled in; fill the rest"
            : "Nothing incorrect to redo"
        }
        onClick={() => onStart(true)}
      >
        Redo incorrect
      </button>
      <button className="rst" title="Delete from history" onClick={reset}>
        {labels[1]}
      </button>
    </>
  );
}
