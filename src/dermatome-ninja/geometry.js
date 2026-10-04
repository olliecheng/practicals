import data from "./dermatomes.json";

export const { width: W, height: H, silhouette } = data;
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
