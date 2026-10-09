import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authClient } from "../lib/auth";
import { setSignedInHint } from "../lib/storage";
import { useAccount } from "../state/AccountContext";

export default function Login() {
  const { acct } = useAccount();
  const [params] = useSearchParams();
  const failed = params.get("error");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function google() {
    setMsg("");
    setBusy(true);
    setSignedInHint(true); // so the drill route waits for the saved record after the redirect back
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/recall-drill/",
      newUserCallbackURL: "/recall-drill/profile",
      errorCallbackURL: "/recall-drill/login",
    });
    if (error) {
      setSignedInHint(false);
      setMsg(error.message || "Could not start Google sign-in.");
      setBusy(false);
    }
  }

  return (
    <div className="panel login">
      {acct ? (
        <p>
          You're signed in as <b>{acct}</b>.
        </p>
      ) : (
        <>
          <p className="note">
            Sign in with your Google account to save your progress and stars. We
            only receive your name, email and profile picture.
          </p>
          <p className="msg" role="alert">
            {msg || (failed && "Sign-in failed. Please try again.")}
          </p>
          <div className="row">
            <button
              className="primary"
              type="button"
              disabled={busy}
              onClick={google}
            >
              Sign in with Google
            </button>
          </div>
        </>
      )}
      <p className="note" style={{ marginTop: 14 }}>
        <Link className="link" to="/">
          ← Back to the drill{acct ? "s" : " (as guest)"}
        </Link>
        {" · "}
        <a className="link" href="/privacy">
          Privacy
        </a>
      </p>
    </div>
  );
}
