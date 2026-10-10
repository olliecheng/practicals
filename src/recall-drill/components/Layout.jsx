import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAccount } from "../state/AccountContext";
import Avatar from "./Avatar";

// Signed in: avatar + name + arrow form one button; clicking it opens a dropdown with Profile and Log out.
// Escape, a click outside, or navigating closes it.
function AccountMenu() {
  const { acct, profile, saveMsg, logout } = useAccount();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const away = (e) =>
      ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="acct acctin" ref={ref}>
      {saveMsg && <span className="savemsg">{saveMsg}</span>}
      <button
        className="acctbtn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="acctname">
          <Avatar user={{ name: acct, image: profile.image }} />
          <span>{acct}</span>
        </span>
        <span className="acctchev" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="acctmenu" role="menu">
          <Link role="menuitem" to="/profile">
            Profile
          </Link>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function Account() {
  const { acct } = useAccount();
  return acct ? (
    <AccountMenu />
  ) : (
    <div className="acct">
      Guest: nothing is saved <Link to="/login">Log in</Link>
    </div>
  );
}

export default function Layout() {
  return (
    <div className="wrap">
      <header>
        <h1>
          <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>
            History recall drill
          </Link>
        </h1>
        <Account />
      </header>
      <Outlet />
    </div>
  );
}
