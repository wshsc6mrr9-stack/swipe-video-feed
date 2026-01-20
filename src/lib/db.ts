// src/lib/db.ts
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "tiktok-feed.sqlite");

export const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  srcType TEXT NOT NULL,
  poster TEXT,
  affUrl TEXT,
  affLabel TEXT,
  createdAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_videos_createdAt ON videos(createdAt DESC);
`);
