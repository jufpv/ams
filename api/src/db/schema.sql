PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ruches (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  code         TEXT NOT NULL UNIQUE,
  nom          TEXT NOT NULL UNIQUE,
  description  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  prenom        TEXT,
  nom           TEXT,
  role          TEXT NOT NULL DEFAULT 'Butineuse'
                  CHECK (role IN ('Butineuse', 'Maçonne', 'Reine')),
  ruche_id      INTEGER REFERENCES ruches(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS adherents (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ruche_id     INTEGER NOT NULL REFERENCES ruches(id) ON DELETE CASCADE,
  prenom       TEXT NOT NULL,
  nom          TEXT NOT NULL,
  email        TEXT,
  telephone    TEXT,
  ville        TEXT,
  code_postal  TEXT,
  type         TEXT NOT NULL DEFAULT 'sympathisant'
                 CHECK (type IN ('adherent', 'sympathisant')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ruche_id, email)
);

CREATE TABLE IF NOT EXISTS evenements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ruche_id     INTEGER NOT NULL REFERENCES ruches(id) ON DELETE CASCADE,
  titre        TEXT NOT NULL,
  description  TEXT,
  lieu         TEXT,
  date_debut   TEXT NOT NULL,
  date_fin     TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS outils (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ruche_id      INTEGER NOT NULL REFERENCES ruches(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  designation   TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  icone         TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL DEFAULT 'liste_entrees'
                  CHECK (type IN ('liste_entrees', 'membres')),
  ordre         INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ruche_id, code)
);

CREATE TABLE IF NOT EXISTS entrees (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  outil_id      INTEGER NOT NULL REFERENCES outils(id) ON DELETE CASCADE,
  designation   TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'lien'
                  CHECK (type IN ('lien', 'note')),
  lien          TEXT NOT NULL DEFAULT '',
  contenu       TEXT NOT NULL DEFAULT '',
  ordre         INTEGER NOT NULL DEFAULT 0,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pieces_jointes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  entree_id       INTEGER NOT NULL REFERENCES entrees(id) ON DELETE CASCADE,
  original_name   TEXT NOT NULL,
  stored_name     TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  size_bytes      INTEGER NOT NULL DEFAULT 0,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_ruches_code ON ruches(code);
CREATE INDEX IF NOT EXISTS idx_adherents_email ON adherents(email);
CREATE INDEX IF NOT EXISTS idx_adherents_ville ON adherents(ville);
CREATE INDEX IF NOT EXISTS idx_evenements_date ON evenements(date_debut);
CREATE INDEX IF NOT EXISTS idx_outils_ruche ON outils(ruche_id);
CREATE INDEX IF NOT EXISTS idx_entrees_outil ON entrees(outil_id);
CREATE INDEX IF NOT EXISTS idx_pieces_jointes_entree ON pieces_jointes(entree_id);
