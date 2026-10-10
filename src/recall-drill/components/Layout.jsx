import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAccount } from "../state/AccountContext";
import Avatar from "./Avatar";

// Signed in: avatar + name (opens Profile) with a dropdown for Profile and Log out. It opens on mouse hover and on keyboard focus;
// on touch the small arrow toggles it. Escape, a tap outside, or navigating closes it.
function AccountMenu() {
  const { acct, profile, saveMsg, logout } = useAccount();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const pointer = useRef("mouse");
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
    <div
      className="acct acctin"
      ref={ref}
      onPointerDown={(e) => (pointer.current = e.pointerType)}
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
      onFocus={(e) => e.target.matches(":focus-visible") && setOpen(true)}
      onBlur={(e) =>
        !e.currentTarget.contains(e.relatedTarget) && setOpen(false)
      }
    >
      {saveMsg && <span className="savemsg">{saveMsg}</span>}
      <div className="acctbtn">
        <Link className="acctname" to="/profile">
          <Avatar user={{ name: acct, image: profile.image }} />
          <span>{acct}</span>
        </Link>
        <button
          className="acctchev"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
          onClick={() =>
            pointer.current === "mouse" ? setOpen(true) : setOpen((o) => !o)
          }
        >
          ▾
        </button>
      </div>
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
