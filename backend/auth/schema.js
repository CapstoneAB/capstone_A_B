// Creates the tables used by login, logout and password reset.
// Safe to run every time the app starts (CREATE TABLE IF NOT EXISTS).
function ensureAuthTables(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS users (user_id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, password_changed_at TEXT);
CREATE TABLE IF NOT EXISTS revoked_tokens (jti TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS password_resets (reset_id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(user_id), token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, used_at INTEGER);`);
}
module.exports = {ensureAuthTables};
