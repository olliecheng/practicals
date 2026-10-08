import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MODES, SYSTEMS } from "../lib/data";
import { drillPath } from "../lib/drillId";
import { playlistById } from "../lib/playlists";
import { useAccount } from "../state/AccountContext";
import { useFilters } from "../state/FilterContext";
import { Group, Row } from "../components/DrillList";
import History from "../components/History";

export default function Playlist() {
  const { playlist } = useParams();
  const pl = playlistById(playlist);
  const { acct, user } = useAccount();
  const f = useFilters();
  const nav = useNavigate();
  const { mode, setMode, starOnly, setStarOnly } = f;

  // The filter context decides what Random / Next / New pick from, so keep it on this playlist
  useEffect(() => {
    if (pl) setMode(pl.id);
  }, [pl, setMode]);

  // Logging out drops the starred filter
  useEffect(() => {
    if (!acct && starOnly) setStarOnly(false);
  }, [acct, starOnly, setStarOnly]);

  if (!pl)
    return (
      <div className="panel">
        <p className="lbl">Playlist not found</p>
        <p className="note">
          <Link className="link" to="/">
            ← Back to the playlists
          </Link>
        </p>
      </div>
    );

  const ds = f.pool(pl.id, user);
  const random = () => {
    const d = f.randPick(pl.id, user, null);
    if (d) nav(drillPath(d));
  };

  return (
    <section className="home">
      <div className="panel">
        <h2 className="pltitle">{pl.title}</h2>
        <p className="pldesc">{pl.desc}</p>
        <div className="big">
          <button className="primary" onClick={random}>
            Random {MODES[pl.id].noun}
          </button>
          {acct && (
            <button
              className="starfilter"
              aria-pressed={starOnly}
              onClick={() => setStarOnly(!starOnly)}
            >
              ★ Starred
            </button>
          )}
        </div>
        <p className="lbl" style={{ marginTop: 18 }}>
          Or pick one
        </p>
        <div className="condlist">
          {!ds.length ? (
            <p className="note" style={{ gridColumn: "1/-1", margin: 0 }}>
              No starred drills here yet.
            </p>
          ) : pl.id !== "cond" ? (
            ds.map((d) => <Row key={d.key} drill={d} />)
          ) : (
            SYSTEMS.filter((s) => ds.some((d) => d.system === s)).map((s) => (
              <Group
                key={s}
                system={s}
                drills={ds.filter((d) => d.system === s)}
              />
            ))
          )}
        </div>
      </div>
      {acct && <History mode={pl.id} />}
    </section>
  );
}
