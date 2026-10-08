import { DATA, PRES, SYS } from "./data";

// Hard-coded for now: one playlist per mode. `id` is the mode key and the URL slug (/p/<id>).
export const PLAYLISTS = [
  {
    id: "cond",
    title: "Conditions",
    desc: "Presentation, risk factors, examination, investigations and management for common conditions, by body system.",
    drills: DATA,
  },
  {
    id: "pres",
    title: "Presentations",
    desc: "Work up a presenting complaint: differentials, associated features and investigations.",
    drills: PRES,
  },
  {
    id: "sys",
    title: "Systems review",
    desc: "Symptoms to ask about for each body system and clinical context.",
    drills: SYS,
  },
];

export const playlistById = (id) => PLAYLISTS.find((p) => p.id === id);

// Drills in the playlist with at least one saved run (guests have none)
export const attempted = (pl, user) =>
  user ? pl.drills.filter((d) => user.drills[d.key]?.runs).length : 0;
