import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { drillFromQuiz, MODES } from "../lib/data";
import { playlistQuizzes, useLoad, usePlaylist, useQuiz } from "../lib/content";
import { decodeLegacyDrill, drillPath, isQuizId } from "../lib/legacy";
import { useAccount } from "../state/AccountContext";
import { useFilters } from "../state/FilterContext";
import {
  hasMissed,
  sectionComplete,
  useDrillGame,
} from "../state/useDrillGame";

function Tile({ i, n, label, s, complete, onCredit, onIgnore }) {
  const cls = s.ignored.has(i)
    ? " on ign"
    : s.credited.has(i)
      ? " on cred"
      : s.found.has(i)
        ? " on"
        : s.recalled.has(i)
          ? " on rec"
          : s.drilling.has(i)
            ? ""
            : s.shown.has(i)
              ? " on rec shown"
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

// Group a section's item indexes by consecutive category: [[cat, [i...]]]
const groups = (drill, idx) =>
  idx.reduce((out, i) => {
    const cat = drill.items[i].cat,
      last = out[out.length - 1];
    if (last && last[0] === cat) last[1].push(i);
    else out.push([cat, [i]]);
    return out;
  }, []);

// One round. Remounted (via key) for every restart, so each round starts from fresh state.
function Game({ drill, inc, restart }) {
  const account = useAccount();
  const filters = useFilters();
  const nav = useNavigate();
  const g = useDrillGame({ drill, account, inc });
  const { s, stats } = g;
  // A drill temporarily forces the Collapse view onto the drilled section (the saved preference is untouched)
  const drilling = !!s.drill;
  const collapsed = g.collapsed || drilling;
  const focus = drilling ? s.drill : s.active;
  // The page background and buttons are recoloured from CSS while drilling
  useEffect(() => {
    document.body.classList.toggle("drilling", drilling);
    return () => document.body.classList.remove("drilling");
  }, [drilling]);
  // Expanding (the toggle, or Reveal ending the round) scrolls the section just revealed or left open into view
  const scrollTo = useRef("");
  const compact = g.collapsed && !s.over;
  const was = useRef({ compact, over: s.over });
  useEffect(() => {
    const prev = was.current;
    was.current = { compact, over: s.over };
    const code = scrollTo.current;
    scrollTo.current = "";
    if (!code || !((prev.compact && !compact) || (!prev.over && s.over)))
      return;
    document
      .getElementById("s" + code)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const reveal = () => {
    scrollTo.current = g.hintCode;
    g.revealSec();
  };
  const toggleCollapsed = () => {
    if (collapsed) scrollTo.current = s.active;
    g.setCollapsed(!collapsed);
  };
  const { acct, user } = account;
  const noun = MODES[drill.mode].noun;
  const starred = !!acct && user.stars.includes(drill.key);

  // New / Next / Back stay in the playlist the drill was opened from, if it is one of its quizzes
  const location = useLocation();
  const ctxId = location.state?.playlist || filters.playlistId;
  const ctx = usePlaylist(ctxId || null, { meta: true });
  const ctxIds = (ctx.status === "ok" ? playlistQuizzes(ctx.data) : []).map(
    (q) => q.id,
  );
  const inCtx = ctxIds.includes(drill.key);
  const another = () => {
    const pick = filters.randPick(ctxIds, user, drill.key);
    if (pick) nav(drillPath(pick), { state: { playlist: ctxId } });
  };
  const menu = () => nav(inCtx ? `/p/${ctxId}` : "/");
  // Header label: the playlist, linking back to it
  const plTitle = inCtx ? ctx.data.title : MODES[drill.mode].label;
  // Hint needs named categories in the section Reveal names
  // The hint only holds for the section it was switched on for
  const hintOn = !!g.hintCode && s.hint === g.hintCode && (!s.over || drilling);
  // The top Drill button drills the open section (collapsed) or else the last section with missed tiles
  const drillCode = drilling
    ? s.drill
    : g.collapsed
      ? s.active
      : ([...stats.sections].reverse().find((x) => hasMissed(drill, s, x.code))
          ?.code ?? "");
  const drillable = !!drillCode && hasMissed(drill, s, drillCode);
  const hintable = drill.items.some((it) => it.code === g.hintCode && it.cat);

  return (
    <section
      id="game"
      className={"play" + (s.over && !drilling ? " over" : "")}
    >
      <div className="side">
        <div className="panel">
          <div className="ttl">
            <div className="sys">
              <Link to={inCtx ? `/p/${ctxId}` : "/"}>{plTitle}</Link>
            </div>
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
          <Byline drill={drill} />
          <p className="prompt">{drill.prompt}</p>
          {!s.over || drilling ? (
            <div className="actions two">
              <div className="arow">
                <button
                  className={"primary" + (drilling ? " drill" : "")}
                  onClick={reveal}
                  disabled={g.revealDisabled}
                >
                  {g.revealLabel}
                </button>
                {(drilling || s.revealed.size > 0) && (
                  <button
                    className="redo bare"
                    type="button"
                    aria-pressed={drilling}
                    disabled={drilling || !drillable}
                    title={
                      drilling
                        ? "Drilling this section"
                        : "Drill the missed items in this section"
                    }
                    aria-label="Drill the missed items in this section"
                    onClick={() => g.startDrill(drillCode)}
                  >
                    ↺
                  </button>
                )}
              </div>
              <div className="arow">
                <button
                  className="hintbtn"
                  aria-pressed={hintOn}
                  onClick={() => g.toggleHint(g.hintCode)}
                  disabled={!hintable}
                  title="Show the categories for this section"
                >
                  <span className="hintbox" aria-hidden="true" />
                  Hint
                </button>
                <button onClick={menu}>Back</button>
                {inCtx && <button onClick={another}>New</button>}
              </div>
            </div>
          ) : (
            <div className="actions">
              <span className="result">{stats.pct}%</span>
              {inCtx && (
                <button className="primary" onClick={another}>
                  Next {noun}
                </button>
              )}
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
            disabled={s.over && !drilling}
            onInput={g.onInput}
            onKeyDown={g.onKeyDown}
          />
          <div className="tline">
            <span>Enter submits short abbreviations</span>
          </div>
        </div>
      </div>
      <div className={"panel tiles" + (drilling ? " drilling" : "")}>
        <div className="chead">
          <p className="counter">
            {stats.got} <span>of {stats.total} found</span>
          </p>
          {drilling ? (
            <div className="drillchip" role="status">
              <span aria-hidden="true">↺</span> Drill mode
            </div>
          ) : (
            <div
              className="seg"
              id="allToggle"
              role="group"
              aria-label="Sections"
              data-state={collapsed ? "collapsed" : "expanded"}
              onClick={toggleCollapsed}
            >
              <span className="pill" />
              <button aria-pressed={collapsed}>Collapse</button>
              <button aria-pressed={!collapsed}>Expand</button>
            </div>
          )}
        </div>
        <div>
          {stats.sections.map((sec) => {
            const shut =
              collapsed && (!s.over || drilling) && sec.code !== focus;
            const idx = drill.items.flatMap((it, i) =>
              it.code === sec.code ? [i] : [],
            );
            const complete = sectionComplete(drill, s, sec.code);
            const active = s.drill === sec.code;
            // One drill at a time: the drilled section shows its button disabled, the others hide theirs
            const canDrill =
              active || (!drilling && hasMissed(drill, s, sec.code));
            // A finished section has nothing left to spoil, so its categories are always shown
            const hasCats = idx.some((i) => drill.items[i].cat);
            // n is the tile's number within its section, whatever the grouping
            const tile = (i) => (
              <Tile
                key={i}
                i={i}
                n={idx.indexOf(i)}
                label={drill.items[i].label}
                s={s}
                complete={complete}
                onCredit={g.toggleCredit}
                onIgnore={g.toggleIgnore}
              />
            );
            return (
              <section
                key={sec.code}
                id={"s" + sec.code}
                className={
                  "sect" +
                  (shut ? " closed" : "") +
                  (collapsed && !s.over && !drilling ? " collapsible" : "") +
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
                  </button>
                  {canDrill && (
                    <button
                      className="redo"
                      type="button"
                      aria-pressed={active}
                      disabled={active}
                      title={
                        active
                          ? "Drilling this section"
                          : "Drill the missed items in this section"
                      }
                      aria-label="Drill the missed items in this section"
                      onClick={() => g.startDrill(sec.code)}
                    >
                      ↺
                    </button>
                  )}
                  <span className="sc" onClick={() => g.setActive(sec.code)}>
                    {sec.count ? `${sec.got} of ${sec.total}` : ""}
                  </span>
                </h3>
                {!idx.length && (
                  <p className="note" style={{ margin: 0 }}>
                    None listed for this {noun}.
                  </p>
                )}
                {(hintOn && sec.code === g.hintCode) ||
                (complete && hasCats) ? (
                  <div className="cats">
                    {groups(drill, idx).map(([cat, list]) => (
                      <fieldset className="cat" key={cat || ""}>
                        {cat && <legend>{cat}</legend>}
                        <div className="board">{list.map(tile)}</div>
                      </fieldset>
                    ))}
                  </div>
                ) : (
                  <div className="board">{idx.map(tile)}</div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// What the quiz was forked from, if anything
function Byline({ drill }) {
  const from = useQuiz(drill.forked_from || null);
  if (!drill.forked_from) return null;
  return (
    <p className="byrow">
      {"Forked from "}
      {from.status === "ok" ? (
        <Link className="link" to={drillPath(drill.forked_from)}>
          {from.data.data?.name || "the original"}
        </Link>
      ) : (
        "another quiz"
      )}
    </p>
  );
}

const NotFound = ({ children = "Drill not found" }) => (
  <div className="panel">
    <p className="lbl">{children}</p>
    <p className="note">
      <Link className="link" to="/">
        ← Back to the drills
      </Link>
    </p>
  </div>
);

export default function Drill() {
  const { id } = useParams();
  return isQuizId(id) ? <QuizDrill id={id} /> : <LegacyDrill id={id} />;
}

// /q/<base64 of "<system>.<name>"> was the URL before drills were quizzes: find the quiz and go to its own address
function LegacyDrill({ id }) {
  const location = useLocation();
  const legacy = useMemo(() => decodeLegacyDrill(id), [id]);
  const st = useLoad(
    legacy ? `/api/quizzes?${new URLSearchParams(legacy)}` : null,
  );
  if (!legacy) return <NotFound />;
  if (st.status === "loading") return <p className="note">Loading…</p>;
  const hit = st.status === "ok" && st.data.items[0];
  if (!hit) return <NotFound />;
  return <Navigate to={drillPath(hit.id)} replace state={location.state} />;
}

function QuizDrill({ id }) {
  const location = useLocation();
  const { ready } = useAccount();
  const st = useQuiz(id);
  const drill = useMemo(
    () => (st.status === "ok" ? drillFromQuiz(st.data) : null),
    [st],
  );
  useEffect(() => {
    document.title = drill
      ? `${drill.name} – History Recall Drill`
      : "History Recall Drill";
    return () => {
      document.title = "History Recall Drill";
    };
  }, [drill]);

  // The saved record (ignored items, redo rounds) is needed to start, so wait for the signed-in user's record to load
  if (!ready || st.status === "loading")
    return <p className="note">Loading…</p>;
  if (st.status === "error" && st.error?.status !== 404)
    return (
      <NotFound>
        Could not load this drill. <button onClick={st.retry}>Retry</button>
      </NotFound>
    );
  if (!drill) return <NotFound />;
  if (drill.deleted)
    return <NotFound>This quiz was deleted by its owner.</NotFound>;
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
