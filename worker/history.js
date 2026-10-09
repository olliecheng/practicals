// Mapping between the client's whole-user record and the `history` table (one row per quiz).
//   record = {v:1, stars:[quizId], drills:{quizId:{runs,last,score,found,credited,ignored}}}
//   rows   = {quizId: {...drill record, starred:boolean}}; a starred drill that was never played is just {starred:true}

export const rowsToRecord = (rows) => {
  const record = { v: 1, stars: [], drills: {} };
  for (const { quiz_id, data } of rows) {
    const { starred, ...drill } = JSON.parse(data);
    if (starred) record.stars.push(quiz_id);
    if (Object.keys(drill).length) record.drills[quiz_id] = drill;
  }
  return record;
};

export const recordToRows = (record) => {
  const rows = {};
  for (const [id, drill] of Object.entries(record.drills))
    rows[id] = { ...drill, starred: record.stars.includes(id) };
  for (const id of record.stars) rows[id] ??= { starred: true };
  return rows;
};

const MAX_ROWS = 5000;
const MAX_KEY = 300;
const isObject = (x) => x && typeof x === "object" && !Array.isArray(x);

// Returns an error message, or null if the record is acceptable
export const checkRecord = (r) => {
  if (!isObject(r) || r.v !== 1) return "bad data";
  if (!Array.isArray(r.stars) || !isObject(r.drills)) return "bad data";
  if (r.stars.length + Object.keys(r.drills).length > MAX_ROWS)
    return "too many drills";
  if (r.stars.some((k) => typeof k !== "string" || !k || k.length > MAX_KEY))
    return "bad data";
  for (const [k, d] of Object.entries(r.drills))
    if (!k || k.length > MAX_KEY || !isObject(d)) return "bad data";
  return null;
};
