import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb, closeDb } from "./index.js";
import { DEFAULT_ROLE, ROLE_LIST, ROLES } from "../constants/roles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROLE_CHECK_SQL = "CHECK (role IN ('Butineuse', 'Maçonne', 'Reine'))";

function tableInfo(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all();
}

function hasColumn(db, table, column) {
  return tableInfo(db, table).some((col) => col.name === column);
}

function ensureColumn(db, table, column, definition) {
  if (!hasColumn(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`+ colonne ${table}.${column}`);
  }
}

function mapLegacyRole(role) {
  if (ROLE_LIST.includes(role)) return role;
  if (role === "admin") return ROLES.MACONNE;
  return ROLES.BUTINEUSE;
}

function getUsersDdl(db) {
  return db
    .prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'`
    )
    .get()?.sql;
}

function migrateUsersRoles(db) {
  const ddl = getUsersDdl(db);
  const hasCurrentCheck = ddl?.includes("'Butineuse', 'Maçonne', 'Reine'");

  if (hasCurrentCheck) {
    const rows = db.prepare("SELECT id, role FROM users").all();
    const update = db.prepare("UPDATE users SET role = ? WHERE id = ?");
    for (const row of rows) {
      const next = mapLegacyRole(row.role);
      if (next !== row.role) update.run(next, row.id);
    }
    return;
  }

  console.log("Migration rôles abeilles → Butineuse / Maçonne / Reine");

  db.exec(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE users_new (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      prenom        TEXT,
      nom           TEXT,
      role          TEXT NOT NULL DEFAULT 'Butineuse'
                      ${ROLE_CHECK_SQL},
      ruche_id      INTEGER REFERENCES ruches(id) ON DELETE SET NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const users = db
    .prepare(
      `SELECT id, email, password_hash, prenom, nom, role, ruche_id, created_at, updated_at
       FROM users`
    )
    .all();

  const insert = db.prepare(`
    INSERT INTO users_new
      (id, email, password_hash, prenom, nom, role, ruche_id, created_at, updated_at)
    VALUES
      (@id, @email, @password_hash, @prenom, @nom, @role, @ruche_id, @created_at, @updated_at)
  `);

  const copy = db.transaction((rows) => {
    for (const row of rows) {
      insert.run({
        ...row,
        role: mapLegacyRole(row.role),
        ruche_id: row.ruche_id ?? null,
      });
    }
  });
  copy(users);

  db.exec(`
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_ruche ON users(ruche_id);
    PRAGMA foreign_keys = ON;
  `);
}

function migrate() {
  const db = getDb();
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);

  ensureColumn(db, "users", "ruche_id", "INTEGER REFERENCES ruches(id) ON DELETE SET NULL");
  ensureColumn(db, "adherents", "ruche_id", "INTEGER REFERENCES ruches(id) ON DELETE CASCADE");
  ensureColumn(db, "evenements", "ruche_id", "INTEGER REFERENCES ruches(id) ON DELETE CASCADE");

  migrateUsersRoles(db);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_ruche ON users(ruche_id);
    CREATE INDEX IF NOT EXISTS idx_adherents_ruche ON adherents(ruche_id);
    CREATE INDEX IF NOT EXISTS idx_evenements_ruche ON evenements(ruche_id);
    CREATE INDEX IF NOT EXISTS idx_outils_ruche ON outils(ruche_id);
    CREATE INDEX IF NOT EXISTS idx_entrees_outil ON entrees(outil_id);
  `);

  const upsert = db.prepare(`
    INSERT INTO meta (key, value) VALUES (@key, @value)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  upsert.run({ key: "schema_version", value: "7" });
  upsert.run({ key: "migrated_at", value: new Date().toISOString() });
  upsert.run({ key: "default_role", value: DEFAULT_ROLE });

  console.log(`Migration OK → ${db.name}`);
  closeDb();
}

migrate();
