// Covers the play area when a round was autosaved a while ago (see Start in routes/Drill.jsx): the player picks up where they left
// off or starts again. The saved round shows behind it, dimmed, with its text blanked (.veiled), so nothing is given away.
export default function ResumePrompt({ got, total, onStartAgain, onResume }) {
  return (
    <div className="resume-veil">
      <div
        className="modal qe-card"
        role="alertdialog"
        aria-labelledby="resume-title"
      >
        <h2 className="qe-title" id="resume-title">
          Resume where you left off?
        </h2>
        <div className="modal-row">
          <button type="button" onClick={onStartAgain}>
            Start again
          </button>
          <button
            type="button"
            className="primary"
            autoFocus
            onClick={onResume}
          >
            Resume ({got}/{total})
          </button>
        </div>
      </div>
    </div>
  );
}
