// Cloudflare D1 adapter for the storage interface in app.js: one JSON blob per username in the `users` table.
// To host elsewhere, write another adapter with the same get/put and pass it to createApp.

// Created on first use, so there is no migration step to run.
let ready;
const init = (db) =>
  (ready ??= db
    .prepare(
      "CREATE TABLE IF NOT EXISTS users (name TEXT PRIMARY KEY, data TEXT NOT NULL, updated INTEGER NOT NULL)",
    )
    .run()
    .catch((e) => {
      ready = undefined;
      throw e;
    }));

export const d1Store = (db) => ({
  async get(name) {
    await init(db);
    const row = await db
      .prepare("SELECT data FROM users WHERE name = ?")
      .bind(name)
      .first();
    return row ? row.data : null;
  },
  async put(name, text) {
    await init(db);
    await db
      .prepare(
        "INSERT INTO users (name, data, updated) VALUES (?1, ?2, ?3) ON CONFLICT(name) DO UPDATE SET data = excluded.data, updated = excluded.updated",
      )
      .bind(name, text, Date.now())
      .run();
  },
});
