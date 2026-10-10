import icP from "../assets/presentation.svg";
import icR from "../assets/risks.svg";
import icE from "../assets/examination.svg";
import icM from "../assets/investigations.svg";
import icT from "../assets/medications.svg";
import { rx, literals } from "./match";

// Section codes. cond: P presentation, R risk factors / etiology, E examination findings, M investigations,
// T medications, treatment, and management. pres: D differentials, A associated features (history), I investigations.
// sys: S symptoms to ask about on a systems review (categories are free-form, per drill).
export const MODES = {
  cond: {
    noun: "condition",
    label: "Conditions",
    sections: [
      { code: "P", name: "Presentation", icon: icP, short: "presentation" },
      {
        code: "R",
        name: "Risk factors / etiology",
        icon: icR,
        short: "risk factors",
      },
      {
        code: "E",
        name: "Examination findings",
        icon: icE,
        short: "examination findings",
      },
      { code: "M", name: "Investigations", icon: icM, short: "investigations" },
      {
        code: "T",
        name: "Medications, treatment, and management",
        icon: icT,
        short: "medications",
      },
    ],
  },
  pres: {
    noun: "presentation",
    label: "Presentations",
    sections: [
      { code: "D", name: "Differentials", icon: icR, short: "differentials" },
      {
        code: "A",
        name: "Associated features (history)",
        icon: icP,
        short: "associated features",
      },
      { code: "I", name: "Investigations", icon: icM, short: "investigations" },
    ],
  },
  sys: {
    noun: "systems review",
    label: "Systems review",
    sections: [
      {
        code: "S",
        name: "Symptoms to ask about",
        icon: icP,
        short: "symptoms",
      },
    ],
  },
};

// Item keys in saved records: "code:label" (renaming a label orphans its saved state). Drills are keyed by their quiz id.
export const ik = (it) => `${it.code}:${it.label}`;

// A section is a plain array (one unnamed category) or {"Category": [items]} (key order = category order).
// Returns [[category name or null, items]]; empty categories are dropped.
const categories = (sec) =>
  (Array.isArray(sec)
    ? [[null, sec]]
    : Object.entries(sec || {}).map(([cat, list]) => [cat || null, list])
  ).filter(([, list]) => Array.isArray(list) && list.length);

// The keys of a quiz's data that hold each mode's sections, with their section codes (see MODES above)
export const SECTION_KEYS = {
  cond: [
    ["presentation", "P"],
    ["risks", "R"],
    ["examination", "E"],
    ["investigations", "M"],
    ["medications", "T"],
  ],
  pres: [
    ["differentials", "D"],
    ["associated", "A"],
    ["investigations", "I"],
  ],
  sys: [["symptoms", "S"]],
};

// The game's view of a quiz from the API ({id, owner, forked_from, data}):
// {key (the quiz id), mode, system, name, prompt, owner, forked_from, deleted, items:[{label, keywords, code, cat, key, re, lits}]}.
// The API stores quiz data as sent, so anything malformed is skipped rather than allowed to crash the page; an unknown mode gives null.
// Memoised per quiz object so the regexes compile once.
const memo = new WeakMap();
export function drillFromQuiz(quiz) {
  if (memo.has(quiz)) return memo.get(quiz);
  const d = quiz.data || {};
  const keys = SECTION_KEYS[d.mode];
  let drill = null;
  if (keys) {
    const items = keys.flatMap(([k, code]) =>
      categories(d[k]).flatMap(([cat, list]) =>
        list.flatMap((it) => {
          if (typeof it?.label !== "string" || typeof it?.keywords !== "string")
            return [];
          try {
            const item = { label: it.label, keywords: it.keywords, code, cat };
            item.key = ik(item);
            item.re = rx(it.keywords);
            item.lits = literals(it.keywords);
            return [item];
          } catch {
            return []; // a keyword that isn't a valid regex
          }
        }),
      ),
    );
    drill = {
      key: quiz.id,
      mode: d.mode,
      system: d.system,
      name: d.name,
      prompt: d.prompt,
      owner: quiz.owner,
      forked_from: quiz.forked_from,
      deleted: !!d.deleted,
      items,
    };
  }
  memo.set(quiz, drill);
  return drill;
}
