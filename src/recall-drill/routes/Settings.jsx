import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authClient } from "../lib/auth";
import { saveSettings, useSettings } from "../lib/content";
import { useAccount } from "../state/AccountContext";
import Avatar from "../components/Avatar";

const OK = /^[A-Za-z0-9_-]{3,30}$/;
const BAD = "Use 3-30 letters, numbers, - or _ (no spaces).";

// 16px outline icon (see DESIGN.md), the same one as the account menu's Log out
const LogoutIcon = () => (
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
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

// Each panel is styled like an old macOS preferences pane: a title strip, then rows with the heading in the left column and
// its content in the right.
export default function Settings() {
  const { acct } = useAccount();
  if (!acct)
    return (
      <div className="panel login">
        <p className="note">
          <Link className="link" to="/login">
            Sign in
          </Link>{" "}
          to see your settings.
        </p>
      </div>
    );
  return (
    <>
      <ProfilePanel />
      <SettingsPanel />
    </>
  );
}

function ProfilePanel() {
  const { acct, profile, logout } = useAccount();
  const [name, setName] = useState(
    profile?.displayUsername || profile?.username || "",
  );
  const [touched, setTouched] = useState(false); // an untouched empty box (a new user's) doesn't start out with an error
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = OK.test(name.trim());

  useEffect(() => {
    if (profile) setName(profile.displayUsername || profile.username || "");
    setTouched(false);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e) {
    e.preventDefault();
    const n = name.trim();
    if (!OK.test(n)) return setMsg(BAD);
    setMsg("");
    setBusy(true);
    if (n.toLowerCase() !== (profile.username || "")) {
      const { data, error } = await authClient.isUsernameAvailable({
        username: n,
      });
      if (error || !data?.available) {
        setMsg(
          error ? "Could not check that username." : "That username is taken.",
        );
        return setBusy(false);
      }
    }
    const { error } = await authClient.updateUser({
      username: n,
      displayUsername: n,
    });
    setMsg(error ? error.message || "Could not save." : "Saved.");
    setBusy(false);
  }

  return (
    <div className="pref">
      <div className="prefhead">Profile</div>

      <div className="prefrow">
        <div className="preflabel">Account</div>
        <div className="prefbody prefwho">
          <Avatar user={{ name: acct, image: profile.image }} size="lg" />
          <div>
            <b>{acct}</b>
            <div className="note" style={{ margin: 0 }}>
              {acct !== profile.name && `${profile.name} · `}
              {profile.email}
            </div>
            <div className="note" style={{ margin: 0 }}>
              Signed in with Google
            </div>
          </div>
        </div>
      </div>

      <form className="prefrow" noValidate onSubmit={save}>
        <label className="preflabel" htmlFor="un">
          Username
        </label>
        <div className="prefbody">
          <div className="prefinput">
            <input
              id="un"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setTouched(true);
                setMsg("");
              }}
              aria-invalid={!valid && touched}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={30}
            />
            <button
              className="subbtn primary"
              type="submit"
              disabled={busy || !valid}
            >
              Save
            </button>
          </div>
          <p className="note" style={{ margin: "6px 0 0" }}>
            Without a username, your name will show as &ldquo;{profile.name}
            &rdquo;.
          </p>
          <p className={"msg" + (!valid && touched ? " bad" : "")} role="alert">
            {!valid && touched ? BAD : msg}
          </p>
        </div>
      </form>

      <div className="prefrow">
        <div className="preflabel">Session</div>
        <div className="prefbody">
          <button className="subbtn prefbtn" onClick={logout}>
            <LogoutIcon />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

// The global settings, shared by everyone: the agent quiz prompt and the category vocabulary. Each row has its own Save.
function SettingsPanel() {
  const { status, data, retry } = useSettings();
  return (
    <div className="pref">
      <div className="prefhead">Settings</div>
      {status === "ok" ? (
        <>
          <PromptRow initial={data.agentQuizPrompt} />
          <CategoriesRow initial={data.categories} />
        </>
      ) : (
        <div className="prefrow">
          <div className="preflabel" />
          <div className="prefbody">
            {status === "loading" ? (
              <p className="note">Loading...</p>
            ) : (
              <p className="note">
                Could not load the settings.{" "}
                <button className="subbtn" onClick={retry}>
                  Try again
                </button>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Saves one setting; returns [msg, busy, save(patch)] where msg is the status text beside the Save button
function useSave() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(patch) {
    setMsg("");
    setBusy(true);
    try {
      await saveSettings(patch);
      setMsg("Saved.");
    } catch (e) {
      setMsg(e.message || "Could not save.");
    }
    setBusy(false);
  }
  return [msg, busy, save];
}

function PromptRow({ initial }) {
  const [text, setText] = useState(initial);
  const [msg, busy, save] = useSave();
  return (
    <form
      className="prefrow"
      onSubmit={(e) => {
        e.preventDefault();
        save({ agentQuizPrompt: text });
      }}
    >
      <label className="preflabel" htmlFor="aqp">
        Agent quiz prompt
      </label>
      <div className="prefbody">
        <textarea
          id="aqp"
          className="prefarea"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={20000}
        />
        <div className="prefsave">
          <button className="subbtn primary" type="submit" disabled={busy}>
            Save
          </button>
          <span className="msg" role="alert">
            {msg}
          </span>
        </div>
      </div>
    </form>
  );
}

// One category per line in the box; stored as the list of names. Blank lines are dropped and repeats (any case) kept once.
const parseCategories = (text) => {
  const seen = new Set();
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(
      (l) => l && !seen.has(l.toLowerCase()) && seen.add(l.toLowerCase()),
    );
};

function CategoriesRow({ initial }) {
  const [text, setText] = useState(initial.join("\n"));
  const [err, setErr] = useState("");
  const [msg, busy, save] = useSave();

  async function submit(e) {
    e.preventDefault();
    const cats = parseCategories(text);
    if (cats.some((c) => c.length > 100))
      return setErr("Each category can be up to 100 characters.");
    setErr("");
    await save({ categories: cats });
    setText(cats.join("\n"));
  }

  return (
    <form className="prefrow" noValidate onSubmit={submit}>
      <label className="preflabel" htmlFor="cats">
        Categories
      </label>
      <div className="prefbody">
        <textarea
          id="cats"
          className="prefarea"
          rows={Math.min(Math.max(text.split("\n").length + 1, 4), 20)}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
        <p className="note" style={{ margin: "6px 0 0" }}>
          One category per line.
        </p>
        <div className="prefsave">
          <button className="subbtn primary" type="submit" disabled={busy}>
            Save
          </button>
          <span className="msg" role="alert">
            {err || msg}
          </span>
        </div>
      </div>
    </form>
  );
}
