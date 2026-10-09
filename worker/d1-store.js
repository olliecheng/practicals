// Cloudflare D1 adapter for the storage interface in app.js. The schema lives in migrations/ (no lazy table creation).
//   store.getHistory(userId)        -> [{quiz_id, data}]
//   store.putHistory(userId, rows)  -> void; rows = {quizId: object}, replaces the user's whole history
// To host elsewhere, write another adapter with the same two methods and pass it to createApp.

export const d1Store = (db) => ({
  async getHistory(userId) {
    const { results } = await db
      .prepare("SELECT quiz_id, data FROM history WHERE user_id = ?")
      .bind(userId)
      .all();
    return results;
  },

  // One batch (one transaction): drop rows the client no longer has, then upsert the rest.
  // Rows whose data is unchanged keep their old `updated` time.
  async putHistory(userId, rows) {
    const json = JSON.stringify(rows);
    await db.batch([
      db
        .prepare(
          "DELETE FROM history WHERE user_id = ?1 AND quiz_id NOT IN (SELECT key FROM json_each(?2))",
        )
        .bind(userId, json),
      db
        .prepare(
          `INSERT INTO history (user_id, quiz_id, data, updated)
           SELECT ?1, key, value, ?3 FROM json_each(?2) WHERE true
           ON CONFLICT (user_id, quiz_id) DO UPDATE SET data = excluded.data, updated = excluded.updated
           WHERE history.data IS NOT excluded.data`,
        )
        .bind(userId, json, Date.now()),
    ]);
  },
});
