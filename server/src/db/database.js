const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../../data/dashboard.db');
let db;

function getDB() {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
}

async function initDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ts         INTEGER NOT NULL,
      cpu_usage  REAL,
      mem_used   INTEGER,
      mem_total  INTEGER,
      disk_used  INTEGER,
      disk_total INTEGER,
      net_rx     INTEGER,
      net_tx     INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_metrics_ts ON metrics_history(ts);

    CREATE TABLE IF NOT EXISTS alerts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ts          INTEGER NOT NULL,
      metric      TEXT NOT NULL,
      threshold   REAL NOT NULL,
      value       REAL NOT NULL,
      resolved    INTEGER DEFAULT 0,
      resolved_ts INTEGER
    );

    CREATE TABLE IF NOT EXISTS alert_rules (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      metric    TEXT NOT NULL UNIQUE,
      threshold REAL NOT NULL,
      enabled   INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS allowed_users (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      email    TEXT NOT NULL UNIQUE,
      name     TEXT,
      added_at INTEGER DEFAULT (strftime('%s','now'))
    );
  `);

  const insertRule = db.prepare('INSERT OR IGNORE INTO alert_rules (metric, threshold) VALUES (?, ?)');
  insertRule.run('cpu_usage', 85);
  insertRule.run('mem_used_pct', 90);
  insertRule.run('disk_used_pct', 85);

  return db;
}

function pruneOldMetrics(hoursToKeep = 24) {
  const cutoff = Math.floor(Date.now() / 1000) - hoursToKeep * 3600;
  getDB().prepare('DELETE FROM metrics_history WHERE ts < ?').run(cutoff);
}

module.exports = { initDB, getDB, pruneOldMetrics };
