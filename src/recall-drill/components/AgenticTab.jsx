import { useState } from "react";
import { briefText, CLOSING } from "../lib/agentBrief";

const CopyIcon = () => (
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
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

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

// Chat pages the instructions can be sent to
const AI_TOOLS = [
  ["ChatGPT", "https://chatgpt.com/"],
  ["Claude", "https://claude.ai/new"],
  ["Gemini", "https://gemini.google.com/app"],
];

// The Agentic tab: a brief to paste into an AI assistant (read-only; instructions, valid categories, the quiz as it is now) and a
// box for the JSON it sends back. Validate and Save live in the editor's button row.
// parts: briefParts() or null while the categories are still loading; text/setText: the pasted JSON
export default function AgenticTab({ parts, text, setText, busy }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false); // the brief is long, so it starts closed; Copy works either way
  // With a url, the AI tool's chat page opens in a new tab. Both happen before the first await so the click still counts as a user gesture
  const copy = async (url) => {
    try {
      const done = navigator.clipboard.writeText(briefText(parts));
      if (url) window.open(url, "_blank", "noopener");
      await done;
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // No clipboard access (e.g. an insecure page): the box is selectable, so the user can copy it by hand
    }
  };
  return (
    <>
      <div className="qe-section">
        <h3 className="qe-title">How to use</h3>
        <div className="qe-card qe-details">
          <ol className="qe-steps">
            <li>
              Press Copy instructions and paste them into an AI assistant.
            </li>
            <li>
              After "Make this change:", say what you want: add items, fix
              keywords, split a category.
            </li>
            <li>
              Copy the JSON it replies with (just the JSON) and paste it into
              the box at the bottom.
            </li>
            <li>
              Press Validate to check it, then Save. Saving replaces the whole
              quiz.
            </li>
          </ol>
        </div>
      </div>
      <div className="qe-section">
        <h3 className="qe-title">
          <button
            type="button"
            className="qe-toggle"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <ChevronIcon open={open} />
            Instructions for the AI
          </button>
        </h3>
        {open && (
          <span
            className="qe-brief"
            tabIndex={0}
            role="textbox"
            aria-readonly="true"
            aria-label="Instructions for the AI (read-only)"
          >
            {parts ? (
              <span className="qe-parts">
                {parts.map((p) => (
                  <span key={p.title} className={`qe-part ${p.tone}`}>
                    <span className="qe-briefhead">{p.title}</span>
                    <span className={p.mono ? "qe-body qe-mono" : "qe-body"}>
                      {p.text}
                    </span>
                  </span>
                ))}
                <span className="qe-part">
                  <span className="qe-body">{CLOSING}</span>
                </span>
              </span>
            ) : (
              <span className="qe-body">Loading the categories...</span>
            )}
          </span>
        )}
        <div className="qe-copyrow">
          <button
            type="button"
            className="primary qe-copy"
            onClick={() => copy()}
            disabled={!parts}
          >
            <CopyIcon />
            {copied ? "Copied" : "Copy instructions"}
          </button>
        </div>
        <div className="qe-copyrow">
          {AI_TOOLS.map(([name, url]) => (
            <button
              key={name}
              type="button"
              title={`Copy the instructions and open ${name}`}
              onClick={() => copy(url)}
              disabled={!parts}
            >
              {name} →
            </button>
          ))}
        </div>
      </div>
      <div className="qe-section">
        <h3 className="qe-title">Edited quiz</h3>
        <textarea
          className="qe-paste"
          rows={16}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the JSON from the AI here"
          spellCheck={false}
          autoComplete="off"
          aria-label="Edited quiz JSON"
          disabled={busy}
        />
      </div>
    </>
  );
}
