import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { byKey, MODES, SYSTEMS } from "../lib/data";
import { drillPath } from "../lib/drillId";
import { useAccount } from "../state/AccountContext";
import { useFilters } from "../state/FilterContext";
import DrillActions from "../components/DrillActions";

const Chip = ({ pressed, onClick, children }) => (
  <button className="chip" aria-pressed={pressed} onClick={onClick}>
    {children}
  </button>
);

// Closes an open row when something outside it is clicked
function useOutsideClose(ref, open, close) {
  useEffect(() => {
    if (!open) return;
    const f = (e) => ref.current && !ref.current.contains(e.target) && close();
    document.addEventListener("click", f);
    return () => document.removeEventListener("click", f);
  }, [open, ref, close]);
}

// Start a drill, optionally redoing the incorrect ones from the saved record
const useStart = (drill) => {
  const nav = useNavigate();
  return (inc) =>
    nav(drillPath(drill), { state: inc ? { inc: true } : undefined });
};

function Row({ drill }) {
  const { acct, user, toggleStar } = useAccount();
  const start = useStart(drill);
  const sv = acct && user.drills[drill.key],
    hist = !!(sv && sv.runs),
    starred = !!acct && user.stars.includes(drill.key);
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, open, () => setOpen(false));
  // Open the popover to the right of the cell, or to the left if it wouldn't fit in the viewport
  const place = () =>
    ref.current &&
    setLeft(
      ref.current.getBoundingClientRect().right + 170 >
        document.documentElement.clientWidth,
    );
  // With history, clicking opens the options popover (it also shows on hover); otherwise start straight away.
  const click = () => {
    if (!hist) return start();
    setOpen((o) => !o);
    place();
  };
  return (
    <div
      ref={ref}
      className={"cell" + (open ? " open" : "")}
      onMouseEnter={hist ? place : undefined}
    >
      <div
        className="rw"
        tabIndex={0}
        role="button"
        onClick={click}
        onKeyDown={(e) => {
          if (
            e.target === e.currentTarget &&
            (e.key === "Enter" || e.key === " ")
          ) {
            e.preventDefault();
            click();
          }
        }}
      >
        <span className="lb">{drill.name}</span>
        {acct && (
          <button
            className="rstar"
            aria-pressed={starred}
            title={starred ? "Unstar" : "Star this drill"}
            aria-label={starred ? "Unstar" : "Star this drill"}
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(drill.key);
            }}
          >
            ★
          </button>
        )}
        {hist && (
          <span
            className="bdg"
            title={`Done ${sv.runs}×, last ${new Date(sv.last).toLocaleDateString()}`}
          >
            {sv.score}%
          </span>
        )}
      </div>
      {hist && (
        <div className={"menu" + (left ? " l" : "")}>
          <div className="mi">
            <DrillActions
              drill={drill}
              sv={sv}
              labels={["Start from scratch", "Reset progress"]}
              onStart={start}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ drill, sv }) {
  const start = useStart(drill);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClose(ref, open, () => setOpen(false));
  const toggle = () => setOpen((o) => !o);
  return (
    <div
      ref={ref}
      className={"hrow" + (open ? " open" : "")}
      tabIndex={0}
      onClick={(e) => !e.target.closest("button") && toggle()}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <div className="hl1">
        <span className="nm">{drill.name}</span>
        <span className="bdg">{sv.score}%</span>
      </div>
      <div className="hl2">
        <div className="meta">
          {drill.mode === "cond" ? drill.system : MODES[drill.mode].label} ·{" "}
          {new Date(sv.last).toLocaleDateString()}
        </div>
        <div className="acts">
          <DrillActions
            drill={drill}
            sv={sv}
            labels={["Restart", "Delete"]}
            onStart={start}
          />
        </div>
      </div>
    </div>
  );
}

function History() {
  const { user } = useAccount();
  const es = Object.entries(user.drills)
    .filter(([k, v]) => v.runs && byKey.has(k))
    .sort((a, b) => b[1].last - a[1].last);
  return (
    <div className="panel" id="hist">
      <p className="lbl">History</p>
      <div className="hist">
        {es.length ? (
          es.map(([k, sv]) => (
            <HistoryRow key={k} drill={byKey.get(k)} sv={sv} />
          ))
        ) : (
          <p className="note" style={{ margin: 0 }}>
            No history yet. Finish a drill from scratch to see it here.
          </p>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { acct, user } = useAccount();
  const f = useFilters();
  const nav = useNavigate();
  const { mode, starOnly, setStarOnly } = f;
  const ds = f.pool(mode, user);

  // Logging out drops the starred filter
  useEffect(() => {
    if (!acct && starOnly) setStarOnly(false);
  }, [acct, starOnly, setStarOnly]);

  const random = () => {
    const d = f.randPick(mode, user, null);
    if (d) nav(drillPath(d));
  };

  return (
    <section className="home">
      <div className="tabwrap">
        <div className="tabs" role="tablist" aria-label="Mode">
          {Object.entries(MODES).map(([m, { label }]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              className="tab"
              onClick={() => f.setMode(m)}
            >
              {label}
            </button>
          ))}
          <button
            role="tab"
            aria-selected={mode === "minis"}
            className="tab"
            onClick={() => f.setMode("minis")}
          >
            Minis
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
        <div className="panel tabpanel" role="tabpanel">
          {mode === "minis" ? (
            <Minis />
          ) : (
            <>
              {mode === "cond" && (
                <div>
                  <p className="lbl">Systems</p>
                  <div className="row">
                    {SYSTEMS.map((s) => (
                      <Chip
                        key={s}
                        pressed={f.selSys.has(s)}
                        onClick={() => f.toggleSys(s)}
                      >
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              <div className="big">
                <button className="primary" onClick={random}>
                  Random {MODES[mode].noun}
                </button>
              </div>
              <p className="lbl" style={{ marginTop: 18 }}>
                Or pick one
              </p>
              <div className="condlist">
                {!ds.length ? (
                  <p className="note" style={{ gridColumn: "1/-1", margin: 0 }}>
                    No starred drills here yet.
                  </p>
                ) : mode !== "cond" ? (
                  ds.map((d) => <Row key={d.key} drill={d} />)
                ) : (
                  SYSTEMS.filter((s) => ds.some((d) => d.system === s)).map(
                    (s) => (
                      <Group
                        key={s}
                        system={s}
                        drills={ds.filter((d) => d.system === s)}
                      />
                    ),
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {acct && <History />}
    </section>
  );
}

// Standalone minigames, separate from the drills
const Minis = () => (
  <div className="condlist">
    <a className="mini" href="/dermatome-ninja.html">
      <b>Dermatome Ninja</b>
      <span>Learn the dermatomes: locate a region or name a point.</span>
    </a>
  </div>
);

// condlist is a grid and the system headings span it, so the group is a fragment rather than a wrapper element
const Group = ({ system, drills }) => (
  <>
    <h3 className="sysh">{system}</h3>
    {drills.map((d) => (
      <Row key={d.key} drill={d} />
    ))}
  </>
);
