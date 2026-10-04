import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { MODES } from "../lib/data";
import { decodeDrill, drillPath } from "../lib/drillId";
import { useAccount } from "../state/AccountContext";
import { useFilters } from "../state/FilterContext";
import { sectionComplete, useDrillGame } from "../state/useDrillGame";

function Tile({ i, n, label, s, complete, onCredit, onIgnore }) {
  const cls = s.ignored.has(i)
    ? " on ign"
    : s.credited.has(i)
      ? " on cred"
      : s.found.has(i)
        ? " on"
        : s.revealed.has(i)
          ? " on miss"
          : "";
  const ok = complete && (s.found.has(i) || s.credited.has(i));
  return (
    <div
      id={"t" + i}
      className={"tile" + cls + (ok ? " ok" : "")}
      onClick={() => onCredit(i)}
    >
      <div className="in">
        <div className="f">{n + 1}</div>
        <div className="b">{label}</div>
      </div>
      <button
        className="ig"
        title="Ignore (or restore) this item"
        aria-label="Ignore or restore this item"
        onClick={(e) => {
          e.stopPropagation();
          onIgnore(i);
        }}
      >
        −
      </button>
    </div>
  );
}

// One round. Remounted (via key) for every restart, so each round starts from fresh state.
function Game({ drill, inc, restart }) {
  const account = useAccount();
  const filters = useFilters();
  const nav = useNavigate();
  const g = useDrillGame({ drill, account, inc });
  const { s, collapsed, stats } = g;
  const { acct, user } = account;
  const noun = MODES[drill.mode].noun;
  const starred = !!acct && user.stars.includes(drill.key);

  const another = () => {
    const d = filters.randPick(drill.mode, user, drill);
    if (d) nav(drillPath(d));
  };
  const menu = () => nav("/");

  return (
    <section id="game" className={"play" + (s.over ? " over" : "")}>
      <div className="side">
        <div className="panel">
          <div className="ttl">
            <div className="sys">{drill.system}</div>
            {acct && (
              <button
                className="star"
                aria-pressed={starred}
                title="Star this drill"
                aria-label="Star this drill"
                onClick={() => account.toggleStar(drill.key)}
              >
                ★
              </button>
            )}
          </div>
          <div className="cond">{drill.name}</div>
          <p className="prompt">{drill.prompt}</p>
          {!s.over ? (
            <div className="actions">
              <button
                className="primary"
                onClick={g.revealSec}
                disabled={g.revealDisabled}
              >
                {g.revealLabel}
              </button>
              <button onClick={menu}>Back</button>
              <button onClick={another}>New</button>
            </div>
          ) : (
            <div className="actions">
              <span className="result">{stats.pct}%</span>
              <button className="primary" onClick={another}>
                Next {noun}
              </button>
              {!g.nothingMissed && (
                <button onClick={() => restart(g.outcome())}>
                  Retry incorrect
                </button>
              )}
              <button onClick={() => restart()}>Retry everything</button>
              <button onClick={menu}>Menu</button>
              {acct && (
                <div className="histrow">
                  <label className="histck">
                    <input
                      type="checkbox"
                      checked={g.histOn}
                      onChange={(e) => g.setHistory(e.target.checked)}
                    />{" "}
                    Add to history
                  </label>
                </div>
              )}
              <span className="note" style={{ flexBasis: "100%", margin: 0 }}>
                Tap a missed tile if you had it.
              </span>
            </div>
          )}
        </div>
        <div className="panel" id="inCard">
          <input
            id="answer"
            ref={g.answerRef}
            type="text"
            placeholder="Type an item…"
            aria-label="Your answer"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={s.over}
            onInput={g.onInput}
            onKeyDown={g.onKeyDown}
          />
          <div className="tline">
            <span>Enter submits short abbreviations</span>
          </div>
        </div>
      </div>
      <div className="panel tiles">
        <div className="chead">
          <p className="counter">
            {stats.got} <span>of {stats.total} found</span>
          </p>
          <div
            className="seg"
            id="allToggle"
            role="group"
            aria-label="Sections"
            data-state={collapsed ? "collapsed" : "expanded"}
            onClick={() => g.setCollapsed(!collapsed)}
          >
            <span className="pill" />
            <button aria-pressed={collapsed}>Collapse</button>
            <button aria-pressed={!collapsed}>Expand</button>
          </div>
        </div>
        <div>
          {stats.sections.map((sec) => {
            const shut = collapsed && !s.over && sec.code !== s.active;
            const idx = drill.items.flatMap((it, i) =>
              it.code === sec.code ? [i] : [],
            );
            return (
              <section
                key={sec.code}
                id={"s" + sec.code}
                className={
                  "sect" +
                  (shut ? " closed" : "") +
                  (collapsed && !s.over ? " collapsible" : "") +
                  (sec.done ? " done" : "")
                }
              >
                <h3 className="sh">
                  <button
                    className="tg"
                    type="button"
                    aria-expanded={!shut}
                    onClick={() => g.setActive(sec.code)}
                  >
                    <span className="nm">
                      <span
                        className="ic"
                        aria-hidden="true"
                        style={{ "--ic": `url("${sec.icon}")` }}
                      />
                      {sec.name}
                    </span>
                    <span className="sc">
                      {sec.count ? `${sec.got} of ${sec.total}` : ""}
                    </span>
                  </button>
                </h3>
                {!idx.length && (
                  <p className="note" style={{ margin: 0 }}>
                    None listed for this {noun}.
                  </p>
                )}
                <div className="board">
                  {idx.map((i, n) => (
                    <Tile
                      key={i}
                      i={i}
                      n={n}
                      label={drill.items[i].label}
                      s={s}
                      complete={sectionComplete(drill, s, sec.code)}
                      onCredit={g.toggleCredit}
                      onIgnore={g.toggleIgnore}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Drill() {
  const { id } = useParams();
  const location = useLocation();
  const { ready } = useAccount();
  const drill = useMemo(() => decodeDrill(id), [id]);
  useEffect(() => {
    document.title = drill
      ? `${drill.name} – History Recall Drill`
      : "History Recall Drill";
    return () => {
      document.title = "History Recall Drill";
    };
  }, [drill]);

  // The saved record (ignored items, redo rounds) is needed to start, so wait for the remembered user to load
  if (!ready) return <p className="note">Loading…</p>;
  if (!drill)
    return (
      <div className="panel">
        <p className="lbl">Drill not found</p>
        <p className="note">
          <Link className="link" to="/">
            ← Back to the drills
          </Link>
        </p>
      </div>
    );
  // location.key changes on every navigation, so Next / New start a fresh round even if the drill repeats
  return <Run key={location.key} drill={drill} inc={location.state?.inc} />;
}

// A round plus its restarts (Retry everything / Retry incorrect)
function Run({ drill, inc }) {
  const [run, setRun] = useState({ n: 0, inc });
  return (
    <Game
      key={run.n}
      drill={drill}
      inc={run.inc}
      restart={(inc) => setRun((r) => ({ n: r.n + 1, inc }))}
    />
  );
}
