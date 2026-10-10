import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { drillFromQuiz, MODES } from "../lib/data";
import { usePlaylist } from "../lib/content";
import { drillPath, featuredId, playlistPath } from "../lib/legacy";
import { useAccount } from "../state/AccountContext";
import { useFilters } from "../state/FilterContext";
import { Group, Row } from "../components/DrillList";
import History from "../components/History";
import PencilIcon from "../components/PencilIcon";
import PlaylistEditor from "../components/PlaylistEditor";

const NotFound = ({ children = "Playlist not found" }) => (
  <div className="panel">
    <p className="lbl">{children}</p>
    <p className="note">
      <Link className="link" to="/">
        ← Back to the playlists
      </Link>
    </p>
  </div>
);

// /p/cond, /p/pres and /p/sys were the three built-in playlists before playlists were stored in the database
export default function Playlist() {
  const { id } = useParams();
  const built = featuredId(id);
  if (built) return <Navigate to={playlistPath(built)} replace />;
  return <PlaylistView id={id} />;
}

function PlaylistView({ id }) {
  const st = usePlaylist(id);
  const { acct, user } = useAccount();
  const f = useFilters();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const { setPlaylist, starOnly, setStarOnly } = f;

  // The filter context decides what Random / Next / New pick from, so keep it on this playlist
  useEffect(() => {
    setPlaylist(id);
  }, [id, setPlaylist]);

  // Logging out drops the starred filter
  useEffect(() => {
    if (!acct && starOnly) setStarOnly(false);
  }, [acct, starOnly, setStarOnly]);

  const pl = st.status === "ok" ? st.data : null;
  // [{title, drills}] without deleted or unreadable quizzes
  const sections = useMemo(
    () =>
      pl
        ? pl.sections.map((s) => ({
            title: s.title,
            drills: s.quizzes.map(drillFromQuiz).filter((d) => d && !d.deleted),
          }))
        : [],
    [pl],
  );

  if (st.status === "loading") return <p className="note">Loading…</p>;
  if (st.status === "error")
    return st.error?.status === 404 ? (
      <NotFound />
    ) : (
      <NotFound>
        Could not load this playlist. <button onClick={st.retry}>Retry</button>
      </NotFound>
    );

  const all = sections.flatMap((s) => s.drills);
  const modes = [...new Set(all.map((d) => d.mode))];
  const noun = modes.length === 1 ? MODES[modes[0]].noun : "quiz";
  const ids = all.map((d) => d.key);
  const shown = sections.map((s) => ({
    ...s,
    drills: s.drills.filter(
      (d) => !starOnly || (user && user.stars.includes(d.key)),
    ),
  }));
  const any = shown.some((s) => s.drills.length);
  const random = () => {
    const pick = f.randPick(ids, user, null);
    if (pick) nav(drillPath(pick), { state: { playlist: id } });
  };

  if (editing)
    return (
      <section className="home">
        <div className="panel">
          <PlaylistEditor
            id={id}
            pl={pl}
            onCancel={() => setEditing(false)}
            onDone={() => {
              setEditing(false);
              st.retry();
            }}
          />
        </div>
      </section>
    );

  return (
    <section className="home">
      <div className="panel">
        <h2 className="pltitle">{pl.title}</h2>
        <p className="pldesc">{pl.description}</p>
        <div className="big">
          <button className="primary" onClick={random} disabled={!ids.length}>
            Random {noun}
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
          {acct && (
            <button
              className="iconbtn"
              aria-label="Edit playlist"
              title="Edit playlist"
              onClick={() => setEditing(true)}
            >
              <PencilIcon />
            </button>
          )}
        </div>
        <p className="lbl" style={{ marginTop: 18 }}>
          Or pick one
        </p>
        <div className="condlist">
          {!any ? (
            <p className="note" style={{ gridColumn: "1/-1", margin: 0 }}>
              {starOnly ? "No starred drills here yet." : "Nothing here yet."}
            </p>
          ) : sections.length > 1 ? (
            shown
              .filter((s) => s.drills.length)
              .map((s, i) => (
                <Group key={i} system={s.title} drills={s.drills} />
              ))
          ) : (
            shown[0].drills.map((d) => <Row key={d.key} drill={d} />)
          )}
        </div>
      </div>
      {acct && <History ids={new Set(ids)} />}
    </section>
  );
}
