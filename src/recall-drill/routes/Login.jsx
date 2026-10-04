import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { blankUser, fetchUser, putUser } from "../lib/storage";
import { useAccount } from "../state/AccountContext";

export default function Login() {
  const { signIn } = useAccount();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // create: false = log in (user must exist), true = create (name must be free)
  async function go(create) {
    const n = name.trim().toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(n))
      return setMsg("Use only letters, numbers, - or _.");
    setMsg("");
    setBusy(true);
    try {
      let u = await fetchUser(n);
      if (create) {
        if (u) throw "That username is taken.";
        u = blankUser();
        await putUser(n, JSON.stringify(u));
      } else if (!u) throw "No account with that username. Use Create account.";
      signIn(n, u);
      nav("/");
    } catch (e) {
      setMsg(typeof e === "string" ? e : "Could not reach the server.");
      setBusy(false);
    }
  }

  return (
    <form
      className="panel login"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        go(false);
      }}
    >
      <label htmlFor="un">Username</label>
      <input
        id="un"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="username"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={100}
        autoFocus
      />
      <p className="note">Pick a unique name that others won't guess.</p>
      <p className="msg" role="alert">
        {msg}
      </p>
      <div className="row">
        <button className="primary" type="submit" disabled={busy}>
          Log in
        </button>
        <button type="button" disabled={busy} onClick={() => go(true)}>
          Create account
        </button>
      </div>
      <p className="note" style={{ marginTop: 14 }}>
        <Link className="link" to="/">
          ← Back to the drill (as guest)
        </Link>
      </p>
    </form>
  );
}
