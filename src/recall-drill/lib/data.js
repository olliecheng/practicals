import icP from "../assets/presentation.svg";
import icR from "../assets/risks.svg";
import icE from "../assets/examination.svg";
import icM from "../assets/investigations.svg";
import icT from "../assets/medications.svg";
import { rx, literals } from "./match";

// A section's name is its key in a quiz's `items`, so the sections of a quiz are free-form. Headings show the name with the first letter
// capitalised; the icons below are matched by name and a section with another name has none.
export const cap = (name) => name.charAt(0).toUpperCase() + name.slice(1);

const SECTION_ICONS = {
  presentation: icP,
  "risk factors / etiology": icR,
  "examination findings": icE,
  investigations: icM,
  "medications, treatment, and management": icT,
  differentials: icR,
  "associated features (history)": icP,
  "symptoms to ask about": icP,
};

// A section is a plain array (one unnamed category) or {"Category": [items]} (key order = category order).
// Returns [[category name or null, items]]; empty categories are dropped.
const categories = (sec) =>
  (Array.isArray(sec)
    ? [[null, sec]]
    : Object.entries(sec || {}).map(([cat, list]) => [cat || null, list])
  ).filter(([, list]) => Array.isArray(list) && list.length);

// The game's view of a quiz from the API ({id, owner, forked_from, data}):
// {key (the quiz id), name, owner, forked_from, deleted, sections:[{name, icon}], items:[{label, keywords, section, cat, key (the label), re, lits}]}.
// Items are saved by label alone, so a label should be used once per quiz.
// The API stores quiz data as sent, so anything malformed is skipped rather than allowed to crash the page; data without any section gives null.
// Memoised per quiz object so the regexes compile once.
const memo = new WeakMap();
export function drillFromQuiz(quiz) {
  if (memo.has(quiz)) return memo.get(quiz);
  const d = quiz.data || {};
  const secs =
    d.items && typeof d.items === "object" && !Array.isArray(d.items)
      ? Object.entries(d.items)
      : [];
  let drill = null;
  if (secs.length) {
    const items = secs.flatMap(([section, sec]) =>
      categories(sec).flatMap(([cat, list]) =>
        list.flatMap((it) => {
          if (typeof it?.label !== "string" || typeof it?.keywords !== "string")
            return [];
          try {
            return [
              {
                label: it.label,
                keywords: it.keywords,
                section,
                cat,
                key: it.label,
                re: rx(it.keywords),
                lits: literals(it.keywords),
              },
            ];
          } catch {
            return []; // a keyword that isn't a valid regex
          }
        }),
      ),
    );
    drill = {
      key: quiz.id,
      name: d.name,
      owner: quiz.owner,
      forked_from: quiz.forked_from,
      deleted: !!d.deleted,
      sections: secs.map(([name]) => ({ name, icon: SECTION_ICONS[name] })),
      items,
    };
  }
  memo.set(quiz, drill);
  return drill;
}
