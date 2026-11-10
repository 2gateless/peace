import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export function createDatabase(dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "peace.sqlite")) {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  if (dbPath !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL;");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      provider TEXT,
      uid TEXT,
      name TEXT,
      username TEXT,
      avatar_url TEXT,
      locale TEXT,
      time_format TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_uid ON users(provider, uid) WHERE provider IS NOT NULL AND uid IS NOT NULL;

    CREATE TABLE IF NOT EXISTS headache_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_time TEXT NOT NULL,
      end_time TEXT,
      intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 10),
      medication TEXT,
      triggers TEXT,
      notes TEXT,
      barometric_pressure REAL CHECK (barometric_pressure IS NULL OR (barometric_pressure >= 870 AND barometric_pressure <= 1085)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_headache_logs_user_start ON headache_logs(user_id, start_time);

    CREATE TABLE IF NOT EXISTS headache_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      headache_log_id INTEGER NOT NULL REFERENCES headache_logs(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_headache_photos_log ON headache_photos(headache_log_id);

    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'abortive',
      default_dose REAL,
      unit TEXT,
      frequency TEXT NOT NULL DEFAULT 'as_needed',
      schedule_note TEXT,
      color TEXT NOT NULL,
      archived_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id);

    CREATE TABLE IF NOT EXISTS medication_doses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      medication_id INTEGER NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
      headache_log_id INTEGER REFERENCES headache_logs(id) ON DELETE SET NULL,
      taken_at TEXT NOT NULL,
      amount REAL,
      unit TEXT,
      duration_minutes INTEGER,
      effectiveness TEXT,
      minutes_to_relief INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_medication_doses_user_taken ON medication_doses(user_id, taken_at);
    CREATE INDEX IF NOT EXISTS idx_medication_doses_med_taken ON medication_doses(medication_id, taken_at);
    CREATE INDEX IF NOT EXISTS idx_medication_doses_log ON medication_doses(headache_log_id);
  `);

  return db;
}

