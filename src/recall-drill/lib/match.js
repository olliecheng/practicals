// Matching. Keywords are word-start stems; "~x" matches anywhere (drug suffixes like ~pril).
// Short keywords (<=3 chars) need a following delimiter so "ed" doesn't fire while typing "edema".
export const rx = (kws) =>
  new RegExp(
    kws
      .split("|")
      .map((k) => {
        if (k[0] === "~") return k.slice(1);
        if (/^[^\w]/.test(k)) return k;
        return k.replace(/\s+$/, "").length <= 3
          ? "\\b" + k.trim() + "s?(?=[^a-z0-9])"
          : "\\b" + k;
      })
      .join("|"),
    "i",
  );

// Literal keywords, used to defer while the typed text could still grow into a longer keyword
export const literals = (kws) =>
  kws
    .toLowerCase()
    .split("|")
    .filter((k) => k[0] !== "~" && !/[.*+?()[\]{}^$\\]/.test(k))
    .map((k) => k.trim())
    .filter(Boolean);

// Abbreviations: only tried when a typed answer matches no tile, and (while typing) only after the idle pause,
// so short ones like "ra" or "ms" can't fire mid-word ("radiotherapy", "msu").
const ABBR = {
  htn: "hypertension",
  af: "atrial fibrillation",
  ckd: "chronic kidney disease",
  aki: "acute kidney injury",
  copd: "chronic obstructive pulmonary disease",
  gord: "reflux",
  dm: "diabetes",
  t2dm: "type 2 diabetes",
  t1dm: "type 1 diabetes",
  ihd: "ischaemic heart disease",
  cad: "ischaemic heart disease",
  mi: "myocardial infarction",
  hf: "heart failure",
  chf: "heart failure",
  cva: "stroke",
  tia: "transient ischaemic attack",
  dvt: "deep vein thrombosis",
  vte: "venous thromboembolism",
  uti: "urinary tract infection",
  bph: "benign prostatic hyperplasia",
  tb: "tuberculosis",
  ra: "rheumatoid arthritis",
  sle: "lupus",
  ms: "multiple sclerosis",
  pcos: "polycystic ovary",
  osa: "obstructive sleep apnoea",
  lvh: "left ventricular hypertrophy",
  gca: "giant cell arteritis",
  pmr: "polymyalgia",
  sdh: "subdural",
  sob: "shortness of breath",
  ecg: "electrocardiogram",
  echo: "echocardiogram",
  cxr: "chest x-ray",
  tft: "thyroid function",
  lft: "liver function",
  uec: "urea electrolytes creatinine",
  fbc: "full blood count",
  fbe: "full blood count",
  bsl: "blood glucose",
  acr: "albumin creatinine",
  pth: "parathyroid hormone",
  tsh: "thyroid stimulating hormone",
  ppi: "proton pump inhibitor",
  nsaid: "non-steroidal anti-inflammatory",
  acei: "ace inhibitor",
  arb: "angiotensin receptor blocker",
  mtx: "methotrexate",
  adt: "androgen deprivation",
  dmard: "disease-modifying",
  hrt: "hormone replacement",
  ocp: "oral contraceptive",
  lmwh: "enoxaparin",
  doac: "apixaban rivaroxaban",
};
export const expandAbbr = (v) =>
  v.replace(/[a-z0-9]+/gi, (w) => ABBR[w.toLowerCase()] || w);

// Earliest match wins, then longest; if what's typed could still become a longer keyword of any other
// item, found or not (e.g. "sputum" -> "sputum culture"), defer instead of firing.
export function judge(items, isFound, v, submit, skip = () => false) {
  const t = submit ? v + " " : v,
    c = [];
  items.forEach((it, i) => {
    if (skip(i)) return;
    const m = it.re.exec(t);
    if (m) c.push([i, m.index, m[0].length]);
  });
  if (!c.length) return null;
  const s0 = Math.min(...c.map((x) => x[1])),
    at = c.filter((x) => x[1] === s0),
    l0 = Math.max(...at.map((x) => x[2]));
  const win = at.filter((x) => x[2] === l0).map((x) => x[0]);
  let defer = false;
  if (!submit) {
    const low = v.toLowerCase().replace(/^\s+/, "");
    defer = items.some(
      (it, i) =>
        !skip(i) &&
        !win.includes(i) &&
        it.lits.some((k) => k.length > low.length && k.startsWith(low)),
    );
  }
  return {
    hit: win.filter((i) => !isFound(i)),
    dup: win.filter((i) => isFound(i)),
    defer,
  };
}
