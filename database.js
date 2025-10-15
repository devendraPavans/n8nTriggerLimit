import Database from "better-sqlite3";

const db = new Database("limits.db");

// Create table if it doesn’t exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS user_limits (
    userId TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    lastReset INTEGER
  )
`).run();

// Reset limit function
export function resetAllLimits() {
  db.prepare(`UPDATE user_limits SET count = 0, lastReset = ?`).run(Date.now());
}

// Get user record
export function getUser(userId) {
  return db.prepare(`SELECT * FROM user_limits WHERE userId = ?`).get(userId);
}

// Increment user count
export function incrementUser(userId) {
  const user = getUser(userId);
  if (user) {
    db.prepare(`UPDATE user_limits SET count = count + 1 WHERE userId = ?`).run(userId);
  } else {
    db.prepare(`INSERT INTO user_limits (userId, count, lastReset) VALUES (?, 1, ?)`)
      .run(userId, Date.now());
  }
}

// Reset all users daily
export function resetIfExpired() {
  const oneDay = 24 * 60 * 60 * 1000;
  const now = Date.now();
  db.prepare(`
    UPDATE user_limits
    SET count = 0, lastReset = ?
    WHERE (? - lastReset) > ?
  `).run(now, now, oneDay);
}

export default db;
