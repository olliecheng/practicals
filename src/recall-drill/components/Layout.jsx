import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAccount } from "../state/AccountContext";
import Avatar from "./Avatar";

// 16px outline icon (see DESIGN.md)
const Icon = ({ d }) => (
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
    <path d={d} />
  </svg>
);

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
          <Link role="menuitem" className="subbtn" to="/profile">
            <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
            Profile
          </Link>
          <button
            role="menuitem"
            className="subbtn"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
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
