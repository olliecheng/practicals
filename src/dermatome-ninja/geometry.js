import data from "./dermatomes.json";

export const W = data.width;
export const H = data.height;
export const { silhouette } = data;
export const DERMATOMES = data.dermatomes;
export const byId = Object.fromEntries(DERMATOMES.map((d) => [d.id, d]));

// Every path is a single polygon ("M x,y x,y ... Z"), so hit-testing needs no DOM
const parse = (d) =>
  d
    .replace(/[MZ]/g, "")
    .trim()
    .split(/\s+/)
    .map((p) => p.split(",").map(Number));

const area = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
};

const inside = (pts, x, y) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      c = !c;
  }
  return c;
};

for (const d of DERMATOMES) {
  d.polys = d.paths.map((p) => {
    const pts = parse(p.d);
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    return {
      view: p.view,
      pts,
      area: area(pts),
      box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
    };
  });
  d.area = d.polys.reduce((s, p) => s + p.area, 0);
}

// Too small to click reliably (S5, the posterior C5/T1 slivers next to the spine, ...), so "pick" never asks for them
export const MIN_PICK_AREA = 1500;
export const pickable = DERMATOMES.filter(
  (d) => d.quiz && d.area >= MIN_PICK_AREA,
);
export const answerable = DERMATOMES.filter((d) => d.quiz);

// Anatomical landmarks, in diagram coordinates. `side` is which way the label runs from the marker (1 = right).
// The figures show the right half of the body, so midline landmarks sit on the inner edge of each figure.
export const LANDMARKS = [
  { name: "Nipple", x: 244, y: 318, side: 1 }, // T4
  { name: "Umbilicus", x: 303, y: 490, side: 1 }, // T10
  { name: "Elbow", x: 150, y: 425, side: -1 },
  { name: "Knee", x: 254, y: 890, side: -1 },
  { name: "Elbow", x: 597, y: 430, side: 1 },
  { name: "Knee", x: 497, y: 900, side: 1 },
  { name: "Anus", x: 444, y: 679, side: -1 }, // S5
];

// Quiz regions: the dermatomes asked about, and the crop of the diagram showing them (anterior and posterior)
const run = (from, to) => {
  const all = DERMATOMES.map((d) => d.id);
  return all.slice(all.indexOf(from), all.indexOf(to) + 1);
};
const PAD = 14;
const box = (ps) => [
  Math.min(...ps.map((p) => p.box[0])),
  Math.min(...ps.map((p) => p.box[1])),
  Math.max(...ps.map((p) => p.box[2])),
  Math.max(...ps.map((p) => p.box[3])),
];
const centres = (polys) =>
  ["anterior", "posterior"].map((v) => {
    const b = box(polys.filter((p) => p.view === v));
    return (b[0] + b[2]) / 2;
  });
const crop = (members) => {
  if (!members) {
    const sil = silhouette.map((s) => {
      const pts = parse(s.d);
      const xs = pts.map((q) => q[0]);
      const ys = pts.map((q) => q[1]);
      return {
        view: s.view,
        box: [
          Math.min(...xs),
          Math.min(...ys),
          Math.max(...xs),
          Math.max(...ys),
        ],
      };
    });
    return { x: 0, y: 0, w: W, h: 1245, centres: centres(sil) };
  }
  // Ignore slivers (e.g. the posterior C5 strip beside the spine) so they don't stretch the crop
  const polys = members.flatMap((id) =>
    byId[id].polys.filter((p) => p.area >= MIN_PICK_AREA),
  );
  const [x0, y0, x1, y1] = box(polys);
  const x = Math.max(0, x0 - PAD);
  const y = Math.max(0, y0 - PAD);
  return {
    x,
    y,
    w: Math.min(W, x1 + PAD) - x,
    h: Math.min(H, y1 + PAD) - y,
    centres: centres(polys),
  };
};
export const REGIONS = {
  all: { label: "All", ids: null },
  upper: { label: "Upper limb", ids: run("C2", "T4") },
  lower: { label: "Lower limb", ids: run("T12", "S5") },
  // The trunk from the shoulder tip down to the upper thigh; the arm dermatomes (C5-T1) are left out
  abdomen: { label: "Abdomen", ids: ["C4", ...run("T2", "L2")] },
};
for (const r of Object.values(REGIONS)) {
  r.crop = crop(r.ids);
  // The dermatomes the region spans, e.g. "C4–T4", for the dropdown
  r.span = r.ids && `${r.ids[0]}\u2013${r.ids.at(-1)}`;
}

// The dermatomes to ask about in a region
export const inRegion = (pool, region) => {
  const m = REGIONS[region].ids;
  return m ? pool.filter((d) => m.includes(d.id)) : pool;
};

// The point (x, y) lies at least `margin` inside polygon `poly`
const wellInside = (poly, x, y, margin) =>
  inside(poly.pts, x, y) &&
  [0, 1, 2, 3, 4, 5, 6, 7].every((k) => {
    const t = (k * Math.PI) / 4;
    return inside(poly.pts, x + margin * Math.cos(t), y + margin * Math.sin(t));
  });

// A random point inside the dermatome, kept away from its borders where there is room
export function randomPoint(d) {
  const total = d.polys.reduce((s, p) => s + p.area, 0);
  let r = Math.random() * total;
  const poly = d.polys.find((p) => (r -= p.area) < 0) || d.polys[0];
  const [x0, y0, x1, y1] = poly.box;
  for (const margin of [9, 6, 3, 0]) {
    for (let i = 0; i < 400; i++) {
      const x = x0 + Math.random() * (x1 - x0);
      const y = y0 + Math.random() * (y1 - y0);
      if (wellInside(poly, x, y, margin)) return { x, y };
    }
  }
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}

// Accepts "l4", "L 4", "t-10"; returns the dermatome id or null
export function parseAnswer(text) {
  const m = text
    .trim()
    .toUpperCase()
    .match(/^([CTLS])[\s-]*(\d{1,2})$/);
  const id = m ? m[1] + Number(m[2]) : text.trim().toUpperCase();
  return byId[id] ? id : null;
}
