import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config.js";

let db;

export function getDb() {
  if (db) return db;

  const dir = path.dirname(config.dbPath);
  fs.mkdirSync(dir, { recursive: true });

  db = new Database(config.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}
