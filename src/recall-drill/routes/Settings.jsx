import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authClient } from "../lib/auth";
import { useAccount } from "../state/AccountContext";
import Avatar from "../components/Avatar";

const OK = /^[A-Za-z0-9_-]{3,30}$/;

// Styled like an old macOS preferences pane: a title strip, then rows with the category heading in the left column and its
// content in the right.
export default function Profile() {
  const { acct, profile, logout } = useAccount();
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
          to see your profile.
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
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={30}
            />
            <button className="primary" type="submit" disabled={busy}>
              Save
            </button>
          </div>
          <p className="note" style={{ margin: "6px 0 0" }}>
            Shown instead of your Google name. 3-30 letters, numbers, - or _.
          </p>
          <p className="msg" role="alert">
            {msg}
          </p>
        </div>
      </form>

      <div className="prefrow">
        <div className="preflabel">Session</div>
        <div className="prefbody">
          <button onClick={logout}>Log out</button>
        </div>
      </div>
    </div>
  );
}
