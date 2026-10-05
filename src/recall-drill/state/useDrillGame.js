import { useEffect, useRef, useState } from "react";
import { MODES } from "../lib/data";
import { judge, variants } from "../lib/match";
import { confetti } from "../lib/confetti";
import { loadCollapsed, saveCollapsed } from "../lib/storage";

// One round of a drill. Tiles are addressed by their index in drill.items.
// State: found (typed), credited (missed but self-credited), revealed (shown), ignored (given up on, left out of the score),
// over (round finished), hint (code of the section whose category boxes are shown, "" if off; it only applies while that section is still the hinted one, so finishing it hides the hint), active (the open section while collapsed).
// Collapsed: only the section `active` is open and matched (counter and score still cover everything). Remembered across drills.
// Drill: retrying a section's missed tiles. drill (code of the section, "" if off), drilling (the tiles hidden again for it), recalled (tiles answered in a drill).
// shown: tiles a drill ended on without an answer (shown in purple, dashed). A drill ends only through endDrill.
// Recalled tiles never reach found/credited, so history, the score and the counters ignore them. While drilling the view is forced to Collapse on that section.

const settled = (s, i) =>
  s.found.has(i) || s.credited.has(i) || s.ignored.has(i);
const pending = (s, i) =>
  !s.found.has(i) && !s.revealed.has(i) && !s.ignored.has(i);
const sectionIdx = (drill, code) =>
  drill.items.flatMap((it, i) => (it.code === code ? [i] : []));
// The first section with something left to name (else the first section)
const firstPending = (drill, s) => {
  const sections = MODES[drill.mode].sections;
  return (
    sections.find((sec) =>
      drill.items.some((it, i) => it.code === sec.code && pending(s, i)),
    ) || sections[0]
  ).code;
};
// A section is complete once every tile is named, credited, ignored or revealed
export const sectionComplete = (drill, s, code) =>
  sectionIdx(drill, code).every((i) => settled(s, i) || s.revealed.has(i));
// Tiles of a section that were revealed and never answered (not found, credited, ignored or recalled)
const missedIdx = (drill, s, code) =>
  sectionIdx(drill, code).filter(
    (i) =>
      s.revealed.has(i) &&
      !s.found.has(i) &&
      !s.credited.has(i) &&
      !s.ignored.has(i) &&
      !s.recalled.has(i),
  );
export const hasMissed = (drill, s, code) =>
  missedIdx(drill, s, code).length > 0;
const allSettled = (drill, s) =>
  drill.items.every((_, i) => settled(s, i) || s.revealed.has(i));

// Counts for display and scoring
export function stats(drill, s) {
  const idx = drill.items.map((_, i) => i);
  const total = idx.filter((i) => !s.ignored.has(i)).length;
  const got = idx.filter(
    (i) => !s.ignored.has(i) && (s.found.has(i) || s.credited.has(i)),
  ).length;
  return {
    total,
    got,
    pct: total ? Math.round((100 * got) / total) : 100,
    sections: MODES[drill.mode].sections.map((sec) => {
      const si = sectionIdx(drill, sec.code),
        n = si.filter((i) => !s.ignored.has(i)).length,
        g = si.filter(
          (i) => !s.ignored.has(i) && (s.found.has(i) || s.credited.has(i)),
        ).length;
      return {
        ...sec,
        count: si.length,
        total: n,
        got: g,
        done: si.length > 0 && g === n,
      };
    }),
  };
}

// inc: true redoes from the saved record; {found, credited} (item keys) redoes from the round just played (also works for guests)
function init(drill, user, inc) {
  const keys = drill.items.map((it) => it.key),
    at = (k) => keys.indexOf(k),
    s = {
      found: new Set(),
      credited: new Set(),
      revealed: new Set(),
      ignored: new Set(),
      recalled: new Set(),
      drilling: new Set(),
      shown: new Set(),
      drill: "",
      over: false,
      hint: "",
      active: "",
    };
  const sv = user && user.drills[drill.key];
  if (sv)
    sv.ignored.forEach((k) => {
      const i = at(k);
      if (i >= 0) s.ignored.add(i);
    });
  const src = inc === true ? sv : inc;
  if (src) {
    src.found.forEach((k) => {
      const i = at(k);
      if (i >= 0 && !s.ignored.has(i)) s.found.add(i);
    });
    src.credited.forEach((k) => {
      const i = at(k);
      if (i >= 0 && !s.ignored.has(i) && !s.found.has(i)) {
        s.credited.add(i);
        s.revealed.add(i);
      }
    });
  }
  s.active = firstPending(drill, s);
  return s;
}

const retrigger = (el, cls) => {
  if (!el) return;
  el.classList.remove("ok", "dup", "bad");
  void el.offsetWidth;
  el.classList.add(cls);
};

export function useDrillGame({ drill, account, inc }) {
  const { items } = drill;
  const sections = MODES[drill.mode].sections;
  const redoRound = !!inc;

  const [s, setS] = useState(() => init(drill, account.user, inc));
  const [collapsed, setCollapsedState] = useState(loadCollapsed);
  const [histOn, setHistOn] = useState(true);

  // Handlers and timers read the latest state from refs, so they never see a stale render
  const sRef = useRef(s);
  const collapsedRef = useRef(collapsed);
  const histOnRef = useRef(true);
  const latest = useRef({});
  latest.current.account = account;
  const counted = useRef(false);
  const prevRec = useRef(null);
  const celebrated = useRef(new Set());
  const swallowing = useRef(false);
  const swT = useRef(null);
  const deferT = useRef(null);
  const answerRef = useRef(null);

  const apply = (ns) => {
    sRef.current = ns;
    setS(ns);
  };
  const act = (st, i) =>
    !collapsedRef.current || st.over || items[i].code === st.active;
  // Ending a drill shows every unanswered drilled tile (as "shown")
  const endDrillState = (st) => ({
    ...st,
    shown: new Set([
      ...st.shown,
      ...[...st.drilling].filter((i) => !st.recalled.has(i)),
    ]),
    drilling: new Set(),
    drill: "",
  });
  const drillCelebrated = useRef(false);
  const nextSec = (st) =>
    sections.find(
      (sec) =>
        (!collapsedRef.current || sec.code === st.active) &&
        items.some((it, i) => it.code === sec.code && pending(st, i)),
    );

  // Sections already complete (prefilled or ignored) must not fire confetti when something else is typed.
  const syncCelebrated = (st) => {
    celebrated.current = new Set(
      sections
        .filter((sec) => {
          const si = sectionIdx(drill, sec.code);
          return si.length && si.every((i) => settled(st, i));
        })
        .map((sec) => sec.code),
    );
  };
  useEffect(() => {
    syncCelebrated(sRef.current);
    answerRef.current?.focus();
    return () => {
      clearTimeout(deferT.current);
      clearTimeout(swT.current);
      latest.current.account.flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A section named in full (by typing, not reveal/credit) earns confetti
  const celebrate = (st) =>
    sections.forEach((sec) => {
      const si = sectionIdx(drill, sec.code);
      if (
        si.length &&
        !celebrated.current.has(sec.code) &&
        si.every((i) => st.found.has(i) || st.ignored.has(i))
      ) {
        celebrated.current.add(sec.code);
        confetti();
      }
    });

  // Persist the round into the user's record: ignored always; found/credited/score once a round is over.
  // done: the round has just finished, so count it as a run.
  const commit = (st, done, hist) => {
    if (!account.acct) return;
    const keysOf = (set) => [...set].map((i) => items[i].key);
    account.mutate((user) => {
      const r = (user.drills[drill.key] ||= {
        runs: 0,
        last: 0,
        score: 0,
        found: [],
        credited: [],
        ignored: [],
      });
      r.ignored = keysOf(st.ignored);
      // A redo round starts from the saved found/credited, so what it saves is the combined result
      if (st.over && hist) {
        r.found = keysOf(st.found);
        r.credited = keysOf(st.credited);
        r.score = stats(drill, st).pct;
      }
      if (done && hist) {
        if (!counted.current) {
          r.runs++;
          counted.current = true;
        }
        r.last = Date.now();
      }
    });
  };

  // Returns the finished state; the caller applies it
  const finishRound = (st) => {
    if (st.over) return st;
    clearTimeout(deferT.current);
    const revealed = new Set(st.revealed);
    items.forEach((_, i) => pending(st, i) && revealed.add(i));
    const ns = { ...st, revealed, over: true };
    // "Add to history" starts ticked (unticked after a redo round): remember the record as it was so unticking can restore it
    if (account.acct) {
      const r = account.user.drills[drill.key];
      prevRec.current = r ? JSON.parse(JSON.stringify(r)) : null;
    }
    const h = !redoRound;
    histOnRef.current = h;
    setHistOn(h);
    commit(ns, true, h);
    account.flush();
    return ns;
  };

  // After a stem matches mid-word (e.g. "orthop" of "orthopnoea"), eat the rest of that answer
  // until a pause or a comma, so the tail doesn't land in the empty box.
  const swallow = () => {
    swallowing.current = true;
    clearTimeout(swT.current);
    swT.current = setTimeout(() => {
      swallowing.current = false;
    }, 200);
  };

  const evaluate = (submit, idle) => {
    clearTimeout(deferT.current);
    const st = sRef.current;
    if (st.over && !st.drill) return;
    const inp = answerRef.current,
      v = inp.value;
    if (!v.trim()) return;
    // In a drill only the hidden tiles are matched, and recalled ones count as already named
    const isFound = st.drill
        ? (i) => !st.drilling.has(i) || st.recalled.has(i)
        : (i) => !pending(st, i),
      skip = st.drill ? (i) => !st.drilling.has(i) : (i) => !act(st, i),
      later = () => {
        deferT.current = setTimeout(
          () => latest.current.evaluate(true, true),
          700,
        );
      };
    let r = judge(items, isFound, v, submit, skip);
    if (!r) {
      const xs = variants(v);
      if (xs.length) {
        if (!submit) return later();
        for (const x of xs) {
          r = judge(items, isFound, x, submit, skip);
          if (r) break;
        }
      }
    }
    if (!r) {
      if (submit && !idle) {
        inp.value = "";
        retrigger(inp, "bad");
      }
      return;
    }
    if (r.defer) return later();
    if (idle && !r.hit.length) return;
    inp.value = "";
    if (!submit && /[a-z0-9]$/i.test(v)) swallow();
    if (r.hit.length && st.drill) {
      const recalled = new Set(st.recalled);
      r.hit.forEach((i) => recalled.add(i));
      const ns = { ...st, recalled };
      retrigger(inp, "ok");
      // Naming every drilled tile earns confetti once, but the drill stays on until End drill
      if (
        !drillCelebrated.current &&
        [...st.drilling].every((i) => recalled.has(i))
      ) {
        drillCelebrated.current = true;
        confetti();
      }
      apply(ns);
    } else if (r.hit.length) {
      const found = new Set(st.found);
      r.hit.forEach((i) => found.add(i));
      const ns = { ...st, found };
      retrigger(inp, "ok");
      celebrate(ns);
      apply(allSettled(drill, ns) ? finishRound(ns) : ns);
    } else {
      retrigger(inp, "dup");
      r.dup.forEach((i) => retrigger(document.getElementById("t" + i), "dup"));
    }
  };
  latest.current.evaluate = evaluate;

  const onInput = (e) => {
    if (swallowing.current) {
      const d = e.nativeEvent.data || "",
        inp = answerRef.current;
      if (/[,;]/.test(d)) {
        swallowing.current = false;
        clearTimeout(swT.current);
        inp.value = inp.value.replace(/^.*[,;]\s*/, "");
      } else {
        inp.value = "";
        swallow();
        return;
      }
    }
    evaluate(false);
  };
  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      swallowing.current = false;
      evaluate(true);
    }
  };

  // Reveal the next section's missed tiles (the open section when collapsed); revealing the last one ends the round
  const revealSec = () => {
    const st = sRef.current;
    if (st.drill) return endDrill();
    if (st.over) return;
    const n = nextSec(st);
    if (!n) return apply(finishRound(st));
    const revealed = new Set(st.revealed);
    items.forEach(
      (it, i) => it.code === n.code && pending(st, i) && revealed.add(i),
    );
    const ns = { ...st, revealed };
    apply(items.some((_, i) => pending(ns, i)) ? ns : finishRound(ns));
  };

  // Hide a section's missed tiles again so they can be retried. Local only: the saved record is not touched. Only endDrill stops it.
  const endDrill = () => {
    clearTimeout(deferT.current);
    apply(endDrillState(sRef.current));
  };
  const startDrill = (code) => {
    const st = sRef.current;
    if (st.drill) return;
    const miss = missedIdx(drill, st, code);
    if (!miss.length) return;
    clearTimeout(deferT.current);
    drillCelebrated.current = false;
    const shown = new Set(st.shown);
    miss.forEach((i) => shown.delete(i));
    apply({ ...st, drill: code, drilling: new Set(miss), shown });
    answerRef.current?.focus();
  };

  const toggleIgnore = (i) => {
    const st = sRef.current,
      ignored = new Set(st.ignored),
      revealed = new Set(st.revealed);
    if (ignored.has(i)) {
      ignored.delete(i);
      if (st.over) revealed.add(i);
    } else {
      // A correct tile can only be ignored once its section is complete
      if (
        (st.found.has(i) || st.credited.has(i)) &&
        !sectionComplete(drill, st, items[i].code)
      )
        return;
      ignored.add(i);
    }
    const ns = { ...st, ignored, revealed };
    syncCelebrated(ns);
    commit(ns, false, histOnRef.current);
    apply(!ns.over && allSettled(drill, ns) ? finishRound(ns) : ns);
  };

  const toggleCredit = (i) => {
    const st = sRef.current;
    if (!st.revealed.has(i) || st.ignored.has(i) || st.drilling.has(i)) return;
    const credited = new Set(st.credited);
    credited.has(i) ? credited.delete(i) : credited.add(i);
    const ns = { ...st, credited };
    apply(ns);
    if (ns.over) commit(ns, false, histOnRef.current);
  };

  const setCollapsed = (want) => {
    const st = sRef.current;
    if (st.over || st.drill || want === collapsedRef.current) return;
    clearTimeout(deferT.current);
    collapsedRef.current = want;
    setCollapsedState(want);
    saveCollapsed(want);
    if (want) apply({ ...st, active: firstPending(drill, st) });
  };
  // Show or hide the category boxes (per round, not saved)
  const toggleHint = (code) => {
    const st = sRef.current;
    if (st.over && !st.drill) return;
    apply({ ...st, hint: st.hint === code ? "" : code });
  };
  const setActive = (code) => {
    const st = sRef.current;
    if (st.over || st.drill || !collapsedRef.current || code === st.active)
      return;
    clearTimeout(deferT.current);
    apply({ ...st, active: code });
  };

  const setHistory = (on) => {
    histOnRef.current = on;
    setHistOn(on);
    if (on) commit(sRef.current, true, true);
    else {
      account.mutate((user) => {
        const r = user.drills[drill.key],
          p = prevRec.current || {
            runs: 0,
            last: 0,
            score: 0,
            found: [],
            credited: [],
          };
        Object.assign(r, {
          runs: p.runs,
          last: p.last,
          score: p.score,
          found: p.found,
          credited: p.credited,
        });
      });
      counted.current = false;
    }
    account.flush();
  };

  // The tiles found or credited so far, as item keys (for "Retry incorrect")
  const outcome = () => {
    const keysOf = (set) => [...set].map((i) => items[i].key);
    return { found: keysOf(s.found), credited: keysOf(s.credited) };
  };

  // One button, labelled with the next section that still has unfound tiles (expanded) or the open section (collapsed)
  const n = nextSec(s);
  const revealLabel = s.drill
    ? "End drill"
    : n
      ? "Reveal " + n.short
      : collapsed
        ? "Reveal " + sections.find((x) => x.code === s.active).short
        : "Finish";
  // The section the hint applies to: the one Reveal names (the open one when collapsed)
  const hintCode = s.drill ? s.drill : n ? n.code : collapsed ? s.active : "";
  const revealDisabled = s.drill ? false : collapsed ? !n : !items.length;

  return {
    s,
    collapsed,
    histOn,
    answerRef,
    onInput,
    onKeyDown,
    revealSec,
    revealLabel,
    revealDisabled,
    startDrill,
    endDrill,
    hintCode,
    toggleHint,
    toggleIgnore,
    toggleCredit,
    setCollapsed,
    setActive,
    setHistory,
    outcome,
    nothingMissed: items.every((_, i) => settled(s, i)),
    stats: stats(drill, s),
  };
}
