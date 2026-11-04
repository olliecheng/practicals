import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { drillFromQuiz } from "../lib/data";
import { usePlaylist } from "../lib/content";
import { drillPath, featuredId, playlistPath } from "../lib/legacy";
import { useTitle } from "../lib/useTitle";
import StepsView from "../components/Steps";

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

export default function Learn() {
  const { id } = useParams();
  const built = featuredId(id);
  if (built) return <Navigate to={`/learn/${built}`} replace />;
  return <LearnView id={id} />;
}

function LearnView({ id }) {
  const st = usePlaylist(id);
  const pl = st.status === "ok" ? st.data : null;
  useTitle(pl && `Learn ${pl.title}`);
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

  return (
    <section className="learn">
      <p className="note">
        <Link className="link" to={playlistPath(id)}>
          ← {pl.title}
        </Link>
      </p>
      {sections.map((s, i) =>
        s.drills.length ? (
          <div key={i}>
            {sections.length > 1 && <h2 className="qe-title">{s.title}</h2>}
            {s.drills.map((d) => (
              <div className="panel learn-quiz" key={d.key}>
                <h2 className="pltitle">
                  <Link to={drillPath(d.key)}>{d.name}</Link>
                </h2>
                <StepsView drill={d} />
              </div>
            ))}
          </div>
        ) : null,
      )}
    </section>
  );
}
