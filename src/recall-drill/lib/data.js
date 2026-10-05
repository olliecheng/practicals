import COND from "../conditions.json";
import PRESENT from "../presentations.json";
import SYSREV from "../systems-review.json";
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

// Saved-record keys: drill "mode|system|name", item "code:label". Renaming a label orphans its saved state.
export const dk = (mode, system, name) => `${mode}|${system}|${name}`;
export const ik = (it) => `${it.code}:${it.label}`;

// A section is a plain array (one unnamed category) or {"Category": [items]} (key order = category order).
// Returns [[category name or null, items]]; empty categories are dropped.
const categories = (sec) =>
  (Array.isArray(sec)
    ? [[null, sec]]
    : Object.entries(sec).map(([cat, list]) => [cat || null, list])
  ).filter(([, list]) => list.length);

// A drill is {key, mode, system, name, prompt, items:[{label, keywords, code, cat, key, re, lits}]}
const flatten = (src, mode, keys) =>
  Object.entries(src).flatMap(([system, drills]) =>
    Object.entries(drills).map(([name, c]) => ({
      key: dk(mode, system, name),
      mode,
      system,
      name,
      prompt: c.prompt,
      items: keys.flatMap(([k, code]) =>
        categories(c[k]).flatMap(([cat, list]) =>
          list.map((it) => {
            const item = { label: it.label, keywords: it.keywords, code, cat };
            item.key = ik(item);
            item.re = rx(it.keywords);
            item.lits = literals(it.keywords);
            return item;
          }),
        ),
      ),
    })),
  );

export const DATA = flatten(COND, "cond", [
  ["presentation", "P"],
  ["risks", "R"],
  ["examination", "E"],
  ["investigations", "M"],
  ["medications", "T"],
]);
export const PRES = flatten(PRESENT, "pres", [
  ["differentials", "D"],
  ["associated", "A"],
  ["investigations", "I"],
]);
export const SYS = flatten(SYSREV, "sys", [["symptoms", "S"]]);
export const SYSTEMS = Object.keys(COND);
export const PRES_SYSTEM = Object.keys(PRESENT)[0];
export const SYS_SYSTEM = Object.keys(SYSREV)[0];

export const byKey = new Map([...DATA, ...PRES, ...SYS].map((d) => [d.key, d]));
