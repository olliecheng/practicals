import { useEffect, useRef, useState } from "react";
import { addQuizToPlaylist, createQuiz } from "../lib/content";

// A modal to start a new quiz in a playlist: its name and the playlist section it goes under. Create makes the quiz with the playlist's
// New quiz template as its sections, adds it to the end of the chosen section and calls onCreated(quizId); the caller opens it for editing.
//   playlistId  the playlist's id
//   pl          the playlist as loaded ({sections:[{title}], quiz_settings:{sections:[name]}})
export default function NewQuizDialog({ playlistId, pl, onCreated, onClose }) {
  const template = pl.quiz_settings?.sections ?? [];
  const titles = pl.sections.map((s) => s.title);
  const [name, setName] = useState("");
  const [section, setSection] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // The quiz's id once it exists, so that trying again after the playlist update failed doesn't make a second quiz
  const made = useRef(null);
  useEffect(() => {
    const key = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  const note = !template.length
    ? "This playlist has no default sections yet. Add some under Edit, in the New quiz template."
    : !titles.length &&
      "This playlist has no sections yet. Add one under Edit.";

  const submit = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setErr("The quiz needs a name.");
    if (n.includes(".")) return setErr("The name can't contain a full stop.");
    setErr("");
    setBusy(true);
    try {
      made.current ??= await createQuiz(n, template);
      await addQuizToPlaylist(playlistId, section, made.current);
      onCreated(made.current);
    } catch (e) {
      setErr(
        (made.current
          ? "The quiz was made but couldn't be added to the playlist: "
          : "Could not create the quiz: ") + e.message,
      );
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-bg"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="modal qe-card"
        role="dialog"
        aria-modal="true"
        aria-label="New quiz"
        onSubmit={submit}
      >
        <h3 className="qe-title">New quiz</h3>
        <label className="qe-kwlbl" htmlFor="new-quiz-name">
          Name
        </label>
        <input
          id="new-quiz-name"
          className="modal-in"
          autoFocus
          value={name}
          readOnly={!!made.current}
          onChange={(e) => setName(e.target.value)}
          placeholder="quiz-name-here"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="qe-kwlbl" id="new-quiz-section">
          Section
        </div>
        {note ? (
          <p className="note" style={{ margin: 0 }}>
            {note}
          </p>
        ) : (
          <div
            className="pick"
            role="listbox"
            aria-labelledby="new-quiz-section"
          >
            {titles.map((t, i) => (
              <button
                key={i}
                type="button"
                role="option"
                aria-selected={i === section}
                className={"subbtn" + (i === section ? " on" : "")}
                onClick={() => setSection(i)}
              >
                {t || "(untitled)"}
              </button>
            ))}
          </div>
        )}
        {err && (
          <div className="qe-error" role="alert" style={{ marginTop: 10 }}>
            <strong>Errors</strong>
            {err}
          </div>
        )}
        <div className="modal-row">
          <button type="button" className="subbtn" onClick={onClose}>
            Cancel
          </button>
          <button className="subbtn primary" disabled={busy || !!note}>
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
