import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authClient } from "../lib/auth";
import { useAccount } from "../state/AccountContext";

const OK = /^[A-Za-z0-9_-]{3,30}$/;

export default function Profile() {
  const { acct, profile } = useAccount();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) setName(profile.displayUsername || profile.username || "");
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!acct)
    return (
      <div className="panel login">
        <p className="note">
          <Link className="link" to="/login">
            Sign in
          </Link>{" "}
          to choose a username.
        </p>
      </div>
    );

  async function save(e) {
    e.preventDefault();
    const n = name.trim();
    if (!OK.test(n))
      return setMsg("Use 3-30 letters, numbers, - or _ (no spaces).");
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
    <form className="panel login" noValidate onSubmit={save}>
      <p className="note">
        Signed in with Google as <b>{profile.name}</b>. An optional username is
        shown instead of your Google name.
      </p>
      <label htmlFor="un">Username</label>
      <input
        id="un"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={30}
        autoFocus
      />
      <p className="msg" role="alert">
        {msg}
      </p>
      <div className="row">
        <button className="primary" type="submit" disabled={busy}>
          Save
        </button>
      </div>
      <p className="note" style={{ marginTop: 14 }}>
        <Link className="link" to="/">
          ← Back to the drills
        </Link>
      </p>
    </form>
  );
}
