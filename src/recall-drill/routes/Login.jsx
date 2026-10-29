import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authClient } from "../lib/auth";
import { setSignedInHint } from "../lib/storage";
import { useAccount } from "../state/AccountContext";
import BetaMessage from "../components/BetaMessage";

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
      callbackURL: "/",
      newUserCallbackURL: "/settings",
      errorCallbackURL: "/login",
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
          <BetaMessage />
          <p className="note">
            MedPunk is beta software. Only whitelisted users can log in.
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
      <div className="login-links">
        <Link className="link" to="/">
          ← Back
        </Link>
        <a className="link" href="/privacy">
          Privacy
        </a>
        <a className="link" href="/tos">
          Terms
        </a>
      </div>
    </div>
  );
}
