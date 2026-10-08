import { Link } from "react-router-dom";
import { attempted, PLAYLISTS } from "../lib/playlists";
import { useAccount } from "../state/AccountContext";
import History from "../components/History";
import Minis from "../components/Minis";

function PlaylistRow({ pl }) {
  const { acct, user } = useAccount();
  const done = acct ? attempted(pl, user) : 0,
    total = pl.drills.length;
  return (
    <Link className="pl" to={`/p/${pl.id}`}>
      <span className="plmeta">
        <span className="pltitle-row">{pl.title}</span>
        <span className="pldesc">{pl.desc}</span>
      </span>
      <span className="plcount">
        {done}/{total}
      </span>
      <span className="plchev" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}

export default function Home() {
  const { acct } = useAccount();
  return (
    <section className="home">
      <div>
        <div className="panel">
          <p className="lbl">Playlists</p>
          <div className="plist">
            {PLAYLISTS.map((pl) => (
              <PlaylistRow key={pl.id} pl={pl} />
            ))}
          </div>
        </div>
        <div className="panel" style={{ marginTop: 14 }}>
          <p className="lbl">Minis</p>
          <Minis />
        </div>
      </div>
      {acct && <History />}
    </section>
  );
}
