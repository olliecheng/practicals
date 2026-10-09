import { Link, Outlet } from "react-router-dom";
import { useAccount } from "../state/AccountContext";

function Account() {
  const { acct, profile, saveMsg, logout } = useAccount();
  if (!acct)
    return (
      <div className="acct">
        Guest: nothing is saved <Link to="/login">Log in</Link>
      </div>
    );
  return (
    <div className="acct">
      {profile.image ? (
        <img
          className="avatar"
          src={profile.image}
          alt=""
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="avatar">{acct[0].toUpperCase()}</span>
      )}
      <span>
        Signed in as <b>{acct}</b>
      </span>
      <Link to="/profile">Profile</Link>
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
