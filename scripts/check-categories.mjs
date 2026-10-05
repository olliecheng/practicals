// Enforces the category vocabulary: every section in conditions.json / presentations.json must be {category: [items]}
// (or []), every category must be in src/recall-drill/categories.json for that section, in vocabulary order.
import { readFileSync } from "fs";

const dir = new URL("../src/recall-drill/", import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, dir), "utf8"));
const vocab = read("categories.json");
const errors = [];
const usage = {};

for (const file of ["conditions", "presentations"]) {
  const data = read(`${file}.json`);
  const sections = vocab[file];
  usage[file] = {};
  for (const [system, entries] of Object.entries(data)) {
    for (const [name, entry] of Object.entries(entries)) {
      const at = `${file}/${system}/${name}`;
      for (const section of Object.keys(sections)) {
        const value = entry[section];
        if (value === undefined) {
          errors.push(`${at}: missing section "${section}"`);
          continue;
        }
        if (Array.isArray(value)) {
          if (value.length)
            errors.push(
              `${at}/${section}: flat array; use {category: [items]}`,
            );
          continue;
        }
        const names = sections[section].map((c) => c.name);
        let last = -1;
        for (const [cat, items] of Object.entries(value)) {
          const idx = names.indexOf(cat);
          if (idx < 0)
            errors.push(`${at}/${section}: "${cat}" is not in the vocabulary`);
          else if (idx < last)
            errors.push(
              `${at}/${section}: "${cat}" is out of vocabulary order`,
            );
          else last = idx;
          if (!Array.isArray(items) || !items.length)
            errors.push(`${at}/${section}/${cat}: empty or not an array`);
          for (const it of items || []) {
            if (
              typeof it?.label !== "string" ||
              typeof it?.keywords !== "string"
            )
              errors.push(
                `${at}/${section}/${cat}: item needs string label and keywords`,
              );
          }
          const u = (usage[file][section] ??= {});
          u[cat] = (u[cat] || 0) + 1;
        }
      }
    }
  }
}

// Systems review: one section, free-form categories (symptom clusters); only the shape is checked
for (const [system, entries] of Object.entries(read("systems-review.json")))
  for (const [name, entry] of Object.entries(entries)) {
    const at = `systems-review/${system}/${name}`;
    if (name.includes(".")) errors.push(`${at}: name must not contain "."`);
    if (!entry.symptoms || Array.isArray(entry.symptoms))
      errors.push(`${at}: symptoms must be {category: [items]}`);
    for (const [cat, items] of Object.entries(entry.symptoms || {})) {
      if (!Array.isArray(items) || !items.length)
        errors.push(`${at}/${cat}: empty or not an array`);
      for (const it of items || [])
        if (typeof it?.label !== "string" || typeof it?.keywords !== "string")
          errors.push(`${at}/${cat}: item needs string label and keywords`);
    }
  }

for (const file of Object.keys(usage))
  for (const [section, u] of Object.entries(usage[file])) {
    const unused = vocab[file][section].map((c) => c.name).filter((n) => !u[n]);
    console.log(
      `${file}/${section}: ${Object.keys(u).length} used${unused.length ? `, unused: ${unused.join(", ")}` : ""}`,
    );
  }
if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors.slice(0, 50)) console.error("  " + e);
  if (errors.length > 50) console.error(`  ... and ${errors.length - 50} more`);
  process.exit(1);
}
console.log("\nOK");
