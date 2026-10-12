// Changing one item of a quiz from the drill screen. The drill's items are flattened copies, so the stored quiz data is
// searched for the item by its section, category and label.
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

// A copy of the quiz data with `change(list, at)` applied to the stored item matching the drill item (`at` is its index in
// `list`); null if it isn't found (e.g. the quiz changed since it was loaded)
function changeItem(data, item, change) {
  const sec = data.items?.[item.section];
  if (!sec) return null;
  const next = structuredClone(data);
  const lists = Array.isArray(sec)
    ? [next.items[item.section]]
    : Object.entries(next.items[item.section]).flatMap(([cat, l]) =>
        (cat || null) === item.cat ? [l] : [],
      );
  for (const list of lists) {
    const at = list.findIndex((it) => it?.label === item.label);
    if (at >= 0) return (change(list, at), next);
  }
  return null;
}

// A copy of the quiz data with `patch` ({label?, keywords?}) applied to the stored item matching the drill item
export const updateItem = (data, item, patch) =>
  changeItem(data, item, (list, at) => Object.assign(list[at], patch));

// A copy of the quiz data without the stored item matching the drill item (its category or section stays, even if now empty)
export const removeItem = (data, item) =>
  changeItem(data, item, (list, at) => list.splice(at, 1));

// Brings the drill's own copy of an item in line with a saved change, so matching works for the rest of the round
export function applyToItem(item, patch) {
  Object.assign(item, patch);
  item.key = item.label;
  item.re = rx(item.keywords);
  item.lits = literals(item.keywords);
}
