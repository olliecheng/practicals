import { Link } from "react-router-dom";
import { playlistQuizzes, useFeaturedPlaylists } from "../lib/content";
import { playlistPath } from "../lib/legacy";
import { useAccount } from "../state/AccountContext";
import History from "../components/History";
import Minis from "../components/Minis";

function PlaylistRow({ pl }) {
  const { acct, user } = useAccount();
  const qs = playlistQuizzes(pl);
  const done = acct ? qs.filter((q) => user.drills[q.id]?.runs).length : 0;
  return (
    <Link className="pl" to={playlistPath(pl.id)}>
      <span className="plmeta">
        <span className="pltitle-row">{pl.title}</span>
        <span className="pldesc">{pl.description}</span>
      </span>
      <span className="plcount">
        {done}/{qs.length}
      </span>
      <span className="plchev" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}

export default function Home() {
  const { acct } = useAccount();
  const f = useFeaturedPlaylists();
  return (
    <section className="home">
      <div>
        <div className="panel">
          <p className="lbl">Playlists</p>
          {f.status === "ok" ? (
            <div className="plist">
              {f.data.map((pl) => (
                <PlaylistRow key={pl.id} pl={pl} />
              ))}
            </div>
          ) : f.status === "error" ? (
            <p className="note" style={{ margin: 0 }}>
              Could not load playlists. <button onClick={f.retry}>Retry</button>
            </p>
          ) : (
            <p className="note" style={{ margin: 0 }}>
              Loading…
            </p>
          )}
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
