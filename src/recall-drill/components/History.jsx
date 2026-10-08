import { useRef, useState } from "react";
import { byKey, MODES } from "../lib/data";
import { useOutsideClose, useStart } from "../lib/useDrillUi";
import { useAccount } from "../state/AccountContext";
import DrillActions from "./DrillActions";

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

// mode: only show history from that playlist; omitted = every playlist
export default function History({ mode }) {
  const { user } = useAccount();
  const es = Object.entries(user.drills)
    .filter(
      ([k, v]) =>
        v.runs && byKey.has(k) && (!mode || byKey.get(k).mode === mode),
    )
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
            {mode
              ? "No history in this playlist yet."
              : "No history yet. Finish a drill from scratch to see it here."}
          </p>
        )}
      </div>
    </div>
  );
}
