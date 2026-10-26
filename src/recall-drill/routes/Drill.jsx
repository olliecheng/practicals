import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { cap, drillFromQuiz } from "../lib/data";
import {
  playlistQuizzes,
  saveQuiz,
  useLoad,
  usePlaylist,
  useQuiz,
} from "../lib/content";
import { decodeLegacyDrill, drillPath, isQuizId } from "../lib/legacy";
import { useDialog } from "../components/Dialog";
import RequireEditor from "../components/RequireEditor";
import ResumePrompt from "../components/ResumePrompt";
import PencilIcon from "../components/PencilIcon";
import QuizEditor from "../components/QuizEditor";
import { ICONS, ItemDialog, TileMenu } from "../components/TileMenu";
import { applyToItem, removeItem, updateItem } from "../lib/editItem";
import { fetchProgress, RESUME_AFTER } from "../lib/progress";
import { useTitle } from "../lib/useTitle";
import { useAccount } from "../state/AccountContext";
import { useFilters } from "../state/FilterContext";
import {
  hasMissed,
  sectionComplete,
  useDrillGame,
} from "../state/useDrillGame";

// With Hint on, a tile that says to avoid or stop something shows that word on its face, shaded red
const WARN = /^(avoid|stop|cease|discontinue|withhold)\b/i;

function Tile({ i, n, label, s, complete, hint, onCredit, onIgnore, onMenu }) {
  const warn = hint && label.match(WARN);
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
  // Face-down tiles have no menu, so nothing is given away
  const menuable = cls.includes("on") || s.revealed.has(i);
  return (
    <div
      id={"t" + i}
      className={"tile" + cls + (ok ? " ok" : "") + (warn ? " warn" : "")}
      onClick={(e) => {
        // Touch screens have no right-click, so a tap opens the menu (its first entry is "I got this")
        if (menuable && window.matchMedia("(hover: none)").matches)
          return onMenu(i, e.clientX, e.clientY);
        onCredit(i);
      }}
      onContextMenu={(e) => {
        if (!menuable) return;
        e.preventDefault();
        onMenu(i, e.clientX, e.clientY);
      }}
    >
      <div className="in">
        <div className="f">
          {warn
            ? warn[0][0].toUpperCase() + warn[0].slice(1).toLowerCase() + "…"
            : n + 1}
        </div>
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
// saved / prompt / fresh: the autosaved round of this quiz (see useDrillGame)
function Game({ drill, inc, restart, quiz, quizData, saved, prompt, fresh }) {
  const account = useAccount();
  const filters = useFilters();
  const nav = useNavigate();
  const { alert, confirm } = useDialog();
  const g = useDrillGame({ drill, account, inc, saved, prompt, fresh });
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
  // Expanding (the toggle, or Reveal ending the round) scrolls the section just revealed or left open into view; the toggle only if it is off screen
  const scrollTo = useRef("");
  const scrollOnlyIfHidden = useRef(false);
  const compact = g.collapsed && !s.over;
  const was = useRef({ compact, over: s.over });
  useEffect(() => {
    const prev = was.current;
    was.current = { compact, over: s.over };
    const name = scrollTo.current;
    const onlyIfHidden = scrollOnlyIfHidden.current;
    scrollTo.current = "";
    scrollOnlyIfHidden.current = false;
    if (!name || !((prev.compact && !compact) || (!prev.over && s.over)))
      return;
    const el = document.getElementById(
      "s" + drill.sections.findIndex((x) => x.name === name),
    );
    if (!el) return;
    // The Expand toggle only scrolls when the section Reveal names is off screen
    if (onlyIfHidden) {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const reveal = () => {
    scrollTo.current = g.hintCode;
    g.revealSec();
  };
  const toggleCollapsed = () => {
    if (collapsed) {
      scrollTo.current = s.active;
      scrollOnlyIfHidden.current = true;
    }
    g.setCollapsed(!collapsed);
  };
  const { acct, user, canEdit } = account;
  // Right-click menu on a revealed tile, and the modal (teach / edit) it opens
  const [tileMenu, setTileMenu] = useState(null); // {i, x, y}
  const [dialog, setDialog] = useState(null); // {mode, i}
  const closeMenu = useCallback(() => setTileMenu(null), []);
  const closeDialog = useCallback(() => setDialog(null), []);
  const saveItem = async (i, patch) => {
    const item = drill.items[i];
    const data = updateItem(quizData.current, item, patch);
    if (!data)
      throw new Error("This item changed in the quiz; reload to edit it.");
    await saveQuiz(quiz.id, data);
    quizData.current = data;
    applyToItem(item, patch);
  };
  // Deletes the item from the stored quiz, then takes its tile out of the round (which carries on as it was)
  const deleteItem = async (i) => {
    if (
      !(await confirm({
        message: "Are you sure you want to delete?",
        unsafe: "Delete",
      }))
    )
      return;
    const data = removeItem(quizData.current, drill.items[i]);
    if (!data)
      return alert("This item changed in the quiz; reload to delete it.");
    try {
      await saveQuiz(quiz.id, data);
    } catch (e) {
      return alert(e.message || "Could not delete.");
    }
    quizData.current = data;
    g.removeItem(i);
  };
  const menuEntries = (i) => {
    const out = [];
    if (!s.ignored.has(i)) {
      if (s.credited.has(i))
        out.push({
          label: "I didn't get this",
          onClick: () => g.toggleCredit(i),
        });
      else if (!s.found.has(i) && s.revealed.has(i) && !s.drilling.has(i))
        out.push({
          icon: ICONS.got,
          label: "I got this",
          onClick: () => g.toggleCredit(i),
        });
    }
    out.push({
      icon: s.ignored.has(i) ? ICONS.restore : ICONS.ignore,
      label: s.ignored.has(i) ? "Restore" : "Ignore",
      onClick: () => g.toggleIgnore(i),
    });
    // Ignore and the credit toggles are personal; changing the quiz is for approved editors only
    if (canEdit) {
      out.push({
        icon: ICONS.teach,
        label: "Teach new keyword",
        onClick: () => setDialog({ mode: "teach", i }),
      });
      out.push({
        icon: ICONS.edit,
        label: "Edit",
        onClick: () => setDialog({ mode: "edit", i }),
      });
      out.push({
        icon: ICONS.trash,
        label: "Delete",
        danger: true,
        onClick: () => deleteItem(i),
      });
    }
    return out;
  };
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
  const plTitle = inCtx ? ctx.data.title : "Recall Drill";
  // Hint needs named categories in the section Reveal names
  // The hint only holds for the section it was switched on for
  const hintOn = !!g.hintCode && s.hint === g.hintCode && (!s.over || drilling);
  // The top Drill button drills the open section (collapsed) or else the last section with missed tiles
  const drillCode = drilling
    ? s.drill
    : g.collapsed
      ? s.active
      : ([...stats.sections].reverse().find((x) => hasMissed(drill, s, x.name))
          ?.name ?? "");
  const drillable = !!drillCode && hasMissed(drill, s, drillCode);
  const hintable = drill.items.some(
    (it) => it.section === g.hintCode && it.cat,
  );

  return (
    <section
      id="game"
      className={"play" + (s.over && !drilling ? " over" : "")}
      // Tapping a button (Hint, Collapse / Expand, ...) must not blur the answer box, or the mobile keyboard closes
      onMouseDown={(e) => {
        if (
          document.activeElement === g.answerRef.current &&
          e.target.closest("button")
        )
          e.preventDefault();
      }}
    >
      <div className="side">
        <div className="panel">
          <div className="ttl">
            <div className="sys">
              <Link to={inCtx ? `/p/${ctxId}` : "/"}>{plTitle}</Link>
            </div>
            {acct && (
              <div className="ttlbtns">
                <button
                  className="subbtn"
                  aria-pressed={starred}
                  title="Star this drill"
                  aria-label="Star this drill"
                  onClick={() => account.toggleStar(drill.key)}
                >
                  ★ {starred ? "Starred" : "Star"}
                </button>
                {canEdit && (
                  <Link
                    className="subbtn"
                    to={`${drillPath(drill.key)}/edit`}
                    title="Edit quiz"
                    aria-label="Edit quiz"
                  >
                    <PencilIcon />
                    Edit
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="cond">{drill.name}</div>
          <Byline drill={drill} />
          {!s.over || drilling ? (
            <div className="actions two">
              <div className="arow">
                <button
                  className={"primary" + (drilling ? " drill" : "")}
                  onClick={reveal}
                  disabled={g.revealDisabled || g.locked}
                >
                  {g.revealLabel}
                </button>
                {(drilling || s.revealed.size > 0) && (
                  <button
                    className="redo bare"
                    type="button"
                    aria-pressed={drilling}
                    disabled={drilling || !drillable || g.locked}
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
                  disabled={!hintable || g.locked}
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
                  Next quiz
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
            enterKeyHint="go"
            disabled={g.locked || (s.over && !drilling)}
            onInput={g.onInput}
            onKeyDown={g.onKeyDown}
          />
          <div className="tline">
            <span>Enter submits short abbreviations</span>
          </div>
        </div>
      </div>
      <div
        className={
          "panel tiles" +
          (drilling ? " drilling" : "") +
          (g.locked ? " veiled" : "")
        }
      >
        {g.locked && (
          <ResumePrompt
            got={saved.got}
            total={saved.total}
            onStartAgain={g.startAgain}
            onResume={g.restore}
          />
        )}
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
          {stats.sections.map((sec, si) => {
            const shut =
              collapsed && (!s.over || drilling) && sec.name !== focus;
            const idx = drill.items.flatMap((it, i) =>
              it.section === sec.name ? [i] : [],
            );
            const complete = sectionComplete(drill, s, sec.name);
            const active = s.drill === sec.name;
            // One drill at a time: the drilled section shows its button disabled, the others hide theirs
            const canDrill =
              active || (!drilling && hasMissed(drill, s, sec.name));
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
                hint={hintOn && sec.name === g.hintCode}
                onCredit={g.toggleCredit}
                onIgnore={g.toggleIgnore}
                onMenu={(i, x, y) => setTileMenu({ i, x, y })}
              />
            );
            return (
              <section
                key={sec.name}
                id={"s" + si}
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
                    onClick={() => g.setActive(sec.name)}
                  >
                    <span className="nm">
                      {sec.icon && (
                        <span
                          className="ic"
                          aria-hidden="true"
                          style={{ "--ic": `url("${sec.icon}")` }}
                        />
                      )}
                      {cap(sec.name)}
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
                      onClick={() => g.startDrill(sec.name)}
                    >
                      ↺
                    </button>
                  )}
                  <span className="sc" onClick={() => g.setActive(sec.name)}>
                    {sec.count ? `${sec.got} of ${sec.total}` : ""}
                  </span>
                </h3>
                {!idx.length && (
                  <p className="note" style={{ margin: 0 }}>
                    None listed for this quiz.
                  </p>
                )}
                {(hintOn && sec.name === g.hintCode) ||
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
      {tileMenu && (
        <TileMenu
          x={tileMenu.x}
          y={tileMenu.y}
          entries={menuEntries(tileMenu.i)}
          onClose={closeMenu}
        />
      )}
      {dialog && (
        <RequireEditor onDenied={closeDialog}>
          <ItemDialog
            mode={dialog.mode}
            item={drill.items[dialog.i]}
            onSave={(patch) => saveItem(dialog.i, patch)}
            onClose={closeDialog}
          />
        </RequireEditor>
      )}
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

// edit: /q/<id>/edit, the quiz editor instead of the drill
export default function Drill({ edit }) {
  const { id } = useParams();
  const location = useLocation();
  // /q/<id> and /q/<id>/edit are separate routes of the same component, so the router would keep one QuizDrill (and the quiz it
  // loaded) across them. Keying on location.key remounts it on every navigation, so each play and each edit reads the quiz afresh.
  return isQuizId(id) ? (
    <QuizDrill key={location.key} id={id} edit={edit} />
  ) : (
    <LegacyDrill id={id} />
  );
}

// /q/<base64 of "<system>.<name>"> was the URL before drills were quizzes: find the quiz by its name and go to its own address.
// The list is newest first, so the last match is the oldest, the seeded built-in.
function LegacyDrill({ id }) {
  const location = useLocation();
  const legacy = useMemo(() => decodeLegacyDrill(id), [id]);
  const st = useLoad(
    legacy ? `/api/quizzes?${new URLSearchParams(legacy)}` : null,
  );
  if (!legacy) return <NotFound />;
  if (st.status === "loading") return <p className="note">Loading…</p>;
  const hit = st.status === "ok" && st.data.items.at(-1);
  if (!hit) return <NotFound />;
  return <Navigate to={drillPath(hit.id)} replace state={location.state} />;
}

function QuizDrill({ id, edit }) {
  const location = useLocation();
  const nav = useNavigate();
  const { ready } = useAccount();
  const st = useQuiz(id);
  const drill = useMemo(
    () => (st.status === "ok" ? drillFromQuiz(st.data) : null),
    [st],
  );
  useTitle(drill && (edit ? `Editing ${drill.name}` : drill.name));

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
  if (edit) {
    // Only approved editors edit; anyone else gets the Access denied dialog and is sent back to the drill
    const back = () => nav(drillPath(id), { replace: true });
    return (
      <RequireEditor onDenied={back}>
        <QuizEditor
          id={id}
          quiz={st.data}
          // A new quiz opens on the Agentic tab
          initialTab={location.state?.tab}
          // Going back remounts this page (see Drill), which reads the saved quiz again
          onDone={back}
          onCancel={back}
        />
      </RequireEditor>
    );
  }
  // location.key changes on every navigation, so Next / New start a fresh round even if the drill repeats
  return (
    <Start
      key={location.key}
      drill={drill}
      quiz={st.data}
      inc={location.state?.inc}
      fresh={!!location.state?.fresh}
    />
  );
}

// Fetches the quiz's autosaved round, if it had one when the page was opened (decided once: the round's own first save must not
// bring this screen back). fresh: the player chose to start over (or redo).
// Otherwise a round saved within RESUME_AFTER carries straight on, and an older one waits behind the resume prompt.
function Start({ drill, quiz, inc, fresh }) {
  const { acct, progress, dropProgress } = useAccount();
  const [had] = useState(() => !!acct && drill.key in progress);
  const [saved, setSaved] = useState(had && !fresh ? undefined : null);
  // Route state is kept in history.state, so a reload or Back would replay "start over" and delete the round played since.
  // Clear the flag from the history entry once it is acted on (not with a router navigation: a new location.key remounts this page).
  useEffect(() => {
    const st = window.history.state;
    if (fresh && st?.usr?.fresh)
      window.history.replaceState(
        { ...st, usr: { ...st.usr, fresh: false } },
        "",
      );
  }, [fresh]);
  useEffect(() => {
    if (saved !== undefined) return;
    let live = true;
    fetchProgress(drill.key)
      .catch(() => null)
      .then((d) => {
        // A save with nothing found is not worth resuming (older saves can be like that)
        if (d && !d.got) {
          dropProgress(drill.key);
          d = null;
        }
        if (live) setSaved(d);
      });
    return () => {
      live = false;
    };
  }, [saved, drill.key, dropProgress]);
  if (saved === undefined) return <p className="note">Loading…</p>;
  return (
    <Run
      drill={drill}
      quiz={quiz}
      inc={inc}
      saved={saved}
      prompt={!!saved && Date.now() - saved.updated >= RESUME_AFTER}
      fresh={had && fresh}
    />
  );
}

// A round plus its restarts (Retry everything / Retry incorrect). Only the first round starts from the autosave.
function Run({ drill, quiz, inc, saved, prompt, fresh }) {
  const [run, setRun] = useState({ n: 0, inc });
  const first = run.n === 0;
  // The stored quiz body as of the last tile Edit / Delete; it outlives the rounds (Game is remounted for each), so a restart
  // keeps editing the latest saved version instead of the one loaded when the page opened
  const quizData = useRef(quiz.data);
  return (
    <Game
      key={run.n}
      drill={drill}
      quiz={quiz}
      quizData={quizData}
      inc={run.inc}
      saved={first ? saved : null}
      prompt={first && prompt}
      fresh={first && fresh}
      restart={(inc) => setRun((r) => ({ n: r.n + 1, inc }))}
    />
  );
}
