import { useCallback, useEffect, useRef, useState } from "react";
import {
  answerable,
  byId,
  DERMATOMES,
  H,
  parseAnswer,
  pickable,
  randomPoint,
  silhouette,
  W,
} from "./geometry";

// Colours of the feedback scheme (recall-drill theme variables, so dark mode follows)
const GREEN = "var(--ok)";
const BLUE = "var(--blue)";
const RED = "var(--bad)";
const TEAL = "var(--teal)";

const label = (id) => byId[id].title;

const sample = (pool, last) => {
  const p = pool.filter((d) => d.id !== last);
  return p[Math.floor(Math.random() * p.length)];
};

const newQuestion = (mode, last) => {
  if (mode === "learn") return { target: null, point: null, guess: null };
  const d = sample(mode === "locate" ? pickable : answerable, last);
  return {
    target: d.id,
    point: mode === "name" ? randomPoint(d) : null,
    guess: null,
  };
};

function Diagram({ q, mode, outlines, hover, onPick, onHover }) {
  const done = q.guess !== null;
  const status = (id) =>
    mode === "learn"
      ? id === hover && TEAL
      : !done
        ? null
        : q.guess === q.target
          ? id === q.target && GREEN
          : id === q.target
            ? BLUE
            : id === q.guess && RED;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="dn-figure"
      role="img"
      aria-label="Dermatome diagram, anterior view on the left and posterior view on the right"
    >
      <g
        fill="var(--tile)"
        stroke="var(--mute)"
        strokeWidth="2"
        strokeLinejoin="round"
        fillRule="evenodd"
      >
        {silhouette.map((s) => (
          <path key={s.view} d={s.d} />
        ))}
      </g>
      <g strokeLinejoin="round" fillRule="evenodd">
        {DERMATOMES.map((d) => {
          const fill = status(d.id);
          return (
            <g
              key={d.id}
              data-dermatome={d.id}
              fill={fill || "transparent"}
              fillOpacity={fill ? 0.8 : 1}
              stroke={fill || (outlines ? "var(--mute)" : "none")}
              strokeWidth={fill ? 2 : 1}
              style={{
                cursor: mode === "locate" && !done ? "crosshair" : "default",
              }}
              onClick={() => mode === "locate" && !done && onPick(d.id)}
              onMouseEnter={() => mode === "learn" && onHover(d.id)}
              onMouseLeave={() => mode === "learn" && onHover(null)}
            >
              {d.paths.map((p, i) => (
                <path key={i} d={p.d} />
              ))}
            </g>
          );
        })}
      </g>
      {mode === "name" && q.point && (
        <g pointerEvents="none">
          <circle
            cx={q.point.x}
            cy={q.point.y}
            r="16"
            fill="var(--ink)"
            opacity="0.18"
          >
            {!done && (
              <animate
                attributeName="r"
                values="9;20;9"
                dur="1.6s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          <circle
            cx={q.point.x}
            cy={q.point.y}
            r="7"
            fill="var(--ink)"
            stroke="var(--panel)"
            strokeWidth="2.5"
          />
        </g>
      )}
      <g
        fill="var(--mute)"
        fontSize="20"
        fontWeight="600"
        letterSpacing="2"
        textAnchor="middle"
        pointerEvents="none"
      >
        <text x="228" y="1268">
          ANTERIOR
        </text>
        <text x="522" y="1268">
          POSTERIOR
        </text>
      </g>
    </svg>
  );
}

export default function DermatomeNinja() {
  const [mode, setMode] = useState("locate");
  const [outlines, setOutlines] = useState(false);
  const [hover, setHover] = useState(null);
  const [q, setQ] = useState(() => newQuestion("locate", null));
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 });
  const input = useRef(null);

  const done = q.guess !== null;
  const correct = done && q.guess === q.target;

  const reset = useCallback((m, last) => {
    setQ(newQuestion(m, last));
    setText("");
    setError("");
  }, []);

  const answer = (guess) => {
    const ok = guess === q.target;
    setQ({ ...q, guess });
    setScore((s) => ({
      right: s.right + ok,
      total: s.total + 1,
      streak: ok ? s.streak + 1 : 0,
    }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (done) return reset(mode, q.target);
    const guess = parseAnswer(text);
    if (!guess) return setError("Enter a dermatome such as C6, T10 or L4.");
    answer(guess);
  };

  const changeMode = (m) => {
    setMode(m);
    setHover(null);
    reset(m, null);
  };

  // Focus the input for each new question; once answered, Enter or Space moves on
  useEffect(() => {
    if (!done) return input.current?.focus();
    document.activeElement?.blur();
    const key = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      e.preventDefault();
      reset(mode, q.target);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [done, q, mode, reset]);

  return (
    <div className="wrap dn">
      <div className="panel dn-diagram">
        <Diagram
          q={q}
          mode={mode}
          outlines={outlines || mode === "learn"}
          hover={hover}
          onPick={(id) => answer(id)}
          onHover={setHover}
        />
      </div>

      <main className="dn-side">
        <header>
          <h1>Dermatome Ninja</h1>
          <a className="link" href="/recall-drill/">
            ← Minis
          </a>
        </header>

        <div>
          <div className="dn-bar">
            <div className="dn-toggle" role="tablist" aria-label="Mode">
              {[
                ["locate", "Locate"],
                ["name", "Name"],
                ["learn", "Learn"],
              ].map(([m, text]) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => changeMode(m)}
                >
                  {text}
                </button>
              ))}
            </div>
            {mode !== "learn" && (
              <button
                className="hintbtn"
                aria-pressed={outlines}
                onClick={() => setOutlines(!outlines)}
              >
                <span className="hintbox" />
                Show outlines
              </button>
            )}
          </div>
          <div className="panel">
            <div role="tabpanel">
              <p className="prompt">
                {mode === "locate"
                  ? "Click the region of the body supplied by this dermatome."
                  : mode === "name"
                    ? "Type the dermatome that supplies the marked point."
                    : "Hover over the body to see which dermatome supplies it."}
              </p>
              {mode === "learn" && (
                <p className="dn-target">{hover ? label(hover) : "\u00a0"}</p>
              )}
              {mode === "locate" && <p className="dn-target">{q.target}</p>}

              <form onSubmit={submit}>
                {mode === "name" && !done && (
                  <input
                    ref={input}
                    id="answer"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      setError("");
                    }}
                    placeholder="e.g. L4, then Enter"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    aria-label="Dermatome"
                  />
                )}
                {error && <p className="dn-msg bad">{error}</p>}

                {done && (
                  <div className="dn-result">
                    <p className={"dn-verdict " + (correct ? "ok" : "bad")}>
                      {correct ? "Correct!" : "Not quite"}
                    </p>
                    {correct ? (
                      <p>
                        That is <b>{label(q.target)}</b>.
                      </p>
                    ) : (
                      <>
                        <p>
                          {mode === "locate" ? "You clicked" : "You answered"}{" "}
                          <b style={{ color: RED }}>{label(q.guess)}</b>{" "}
                          <span className="note">(red)</span>
                        </p>
                        <p>
                          {mode === "locate"
                            ? "The correct dermatome is"
                            : "It is"}{" "}
                          <b style={{ color: BLUE }}>{label(q.target)}</b>{" "}
                          <span className="note">(blue)</span>
                        </p>
                      </>
                    )}
                  </div>
                )}

                {(done || mode === "name") && (
                  <div className="big">
                    <button type="submit" className="primary">
                      {done ? "Next" : "Check"}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {mode !== "learn" && (
          <p className="note">
            <b>{score.right}</b> / {score.total} correct
            {score.streak > 1 && <span> · streak {score.streak}</span>}
          </p>
        )}
        <p className="note dn-credit">
          Stylised map adapted from Dermatoms.svg by Ralf Stephan (public
          domain). Both figures show the right side of the body.
        </p>
      </main>
    </div>
  );
}
