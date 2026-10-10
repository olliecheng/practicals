// Changing one item of a quiz from the drill screen. The drill's items are flattened copies, so the stored quiz data is
// searched for the item by its section (code), category and label.
import { SECTION_KEYS, ik } from "./data";
import { literals, rx } from "./match";

// Keywords are stored as "a|b|c" and edited as "a, b, c"
export const toText = (kw) =>
  kw
    .split("|")
    .map((k) => k.trim())
    .filter(Boolean)
    .join(", ");
export const toKeywords = (text) =>
  text
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .join("|");

// A copy of the quiz data with `patch` ({label?, keywords?}) applied to the stored item matching the drill item; null if it
// isn't found (e.g. the quiz changed since it was loaded)
export function updateItem(data, item, patch) {
  const key = SECTION_KEYS[data.mode]?.find(
    ([, code]) => code === item.code,
  )?.[0];
  const sec = key && data[key];
  if (!sec) return null;
  const next = structuredClone(data);
  const lists = Array.isArray(next[key])
    ? [next[key]]
    : Object.entries(next[key]).flatMap(([cat, l]) =>
        (cat || null) === item.cat ? [l] : [],
      );
  for (const list of lists) {
    const hit = list.find((it) => it?.label === item.label);
    if (hit) return (Object.assign(hit, patch), next);
  }
  return null;
}

// Brings the drill's own copy of an item in line with a saved change, so matching works for the rest of the round
export function applyToItem(item, patch) {
  Object.assign(item, patch);
  item.key = ik(item);
  item.re = rx(item.keywords);
  item.lits = literals(item.keywords);
}
