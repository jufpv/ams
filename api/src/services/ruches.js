import { getDb } from "../db/index.js";

export function findRucheByCode(code) {
  return getDb()
    .prepare(
      `SELECT id, code, nom, description, created_at, updated_at
       FROM ruches
       WHERE code = ?`
    )
    .get(code);
}

export function findRucheById(id) {
  return getDb()
    .prepare(
      `SELECT id, code, nom, description, created_at, updated_at
       FROM ruches
       WHERE id = ?`
    )
    .get(id);
}

export function ensureRuche({ code, nom, description = null }) {
  const existing = findRucheByCode(code);
  if (existing) {
    getDb()
      .prepare(
        `UPDATE ruches
         SET nom = @nom,
             description = COALESCE(@description, description),
             updated_at = datetime('now')
         WHERE id = @id`
      )
      .run({
        id: existing.id,
        nom,
        description,
      });
    return findRucheById(existing.id);
  }

  const result = getDb()
    .prepare(
      `INSERT INTO ruches (code, nom, description)
       VALUES (@code, @nom, @description)`
    )
    .run({ code, nom, description });

  return findRucheById(result.lastInsertRowid);
}
