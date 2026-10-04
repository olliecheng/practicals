import { Link, Outlet } from "react-router-dom";
import { useAccount } from "../state/AccountContext";

const pretty = (n) =>
  n.replace(/(^|[_-])([a-z])/g, (m, d, c) => d + c.toUpperCase());

function Account() {
  const { acct, saveMsg, logout } = useAccount();
  if (!acct)
    return (
      <div className="acct">
        Guest: nothing is saved <Link to="/login">Log in</Link>
      </div>
    );
  return (
    <div className="acct">
      <span>
        Signed in as <b>{pretty(acct)}</b>
      </span>
      <button onClick={logout}>Log out</button>
      <span>{saveMsg}</span>
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
