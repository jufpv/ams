import { getDb } from "../db/index.js";

export const DEFAULT_OUTILS = [
  {
    code: "adherents",
    designation: "Adhérents",
    description: "Gérez vos adhérents et sympathisants",
    icone: "icons/adherents.svg",
    ordre: 1,
  },
  {
    code: "evenements",
    designation: "Événements",
    description: "Organisez et suivez vos événements",
    icone: "icons/evenements.svg",
    ordre: 2,
  },
  {
    code: "communication",
    designation: "Communication",
    description: "Diffusez vos messages et actualités",
    icone: "icons/communication.svg",
    ordre: 3,
  },
  {
    code: "parrainages",
    designation: "Parrainages",
    description: "Suivez vos parrainages et signatures",
    icone: "icons/parrainages.svg",
    ordre: 4,
  },
  {
    code: "campagnes",
    designation: "Campagnes",
    description: "Créez et gérez vos campagnes",
    icone: "icons/campagnes.svg",
    ordre: 5,
  },
  {
    code: "finances",
    designation: "Finances",
    description: "Suivez vos dons et dépenses",
    icone: "icons/finances.svg",
    ordre: 6,
  },
];

export function listOutilsByRuche(rucheId) {
  return getDb()
    .prepare(
      `SELECT id, ruche_id, code, designation, description, icone, ordre, created_at, updated_at
       FROM outils
       WHERE ruche_id = ?
       ORDER BY ordre ASC, id ASC`
    )
    .all(rucheId);
}

export function findOutilById(id) {
  return getDb()
    .prepare(
      `SELECT id, ruche_id, code, designation, description, icone, ordre, created_at, updated_at
       FROM outils
       WHERE id = ?`
    )
    .get(id);
}

export function findOutilByCode(rucheId, code) {
  return getDb()
    .prepare(
      `SELECT id, ruche_id, code, designation, description, icone, ordre, created_at, updated_at
       FROM outils
       WHERE ruche_id = ? AND code = ?`
    )
    .get(rucheId, code);
}

export function findOutilForRuche(rucheId, idOrCode) {
  const asId = Number(idOrCode);
  if (Number.isInteger(asId) && String(asId) === String(idOrCode)) {
    const byId = findOutilById(asId);
    if (byId && byId.ruche_id === rucheId) return byId;
  }
  return findOutilByCode(rucheId, idOrCode);
}

export function ensureOutilsForRuche(rucheId) {
  const existing = listOutilsByRuche(rucheId);
  if (existing.length > 0) return existing;

  const insert = getDb().prepare(`
    INSERT INTO outils (ruche_id, code, designation, description, icone, ordre)
    VALUES (@ruche_id, @code, @designation, @description, @icone, @ordre)
  `);

  const seed = getDb().transaction(() => {
    for (const outil of DEFAULT_OUTILS) {
      insert.run({ ruche_id: rucheId, ...outil });
    }
  });

  seed();
  return listOutilsByRuche(rucheId);
}

function slugify(value) {
  const base = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `outil-${Date.now()}`;
}

function uniqueCode(rucheId, desired) {
  const db = getDb();
  let code = slugify(desired);
  let n = 2;
  while (
    db
      .prepare("SELECT 1 FROM outils WHERE ruche_id = ? AND code = ?")
      .get(rucheId, code)
  ) {
    code = `${slugify(desired)}-${n}`;
    n += 1;
  }
  return code;
}

export function createOutil(
  rucheId,
  { designation, description = "", icone = "", code = null, ordre = null }
) {
  const nextDesignation = String(designation || "").trim();
  if (!nextDesignation) {
    const err = new Error("La désignation est obligatoire.");
    err.status = 400;
    throw err;
  }

  const nextDescription = String(description || "").trim();
  const nextIcone = String(icone || "").trim();
  const nextCode = uniqueCode(rucheId, code || nextDesignation);

  const maxOrdre = getDb()
    .prepare("SELECT COALESCE(MAX(ordre), 0) AS max FROM outils WHERE ruche_id = ?")
    .get(rucheId).max;

  const nextOrdre =
    ordre != null && Number.isFinite(Number(ordre))
      ? Number(ordre)
      : maxOrdre + 1;

  const result = getDb()
    .prepare(
      `INSERT INTO outils (ruche_id, code, designation, description, icone, ordre)
       VALUES (@ruche_id, @code, @designation, @description, @icone, @ordre)`
    )
    .run({
      ruche_id: rucheId,
      code: nextCode,
      designation: nextDesignation,
      description: nextDescription,
      icone: nextIcone,
      ordre: nextOrdre,
    });

  return findOutilById(result.lastInsertRowid);
}

export function deleteOutil(id, rucheId) {
  const current = findOutilById(id);
  if (!current || current.ruche_id !== rucheId) {
    const err = new Error("Outil introuvable.");
    err.status = 404;
    throw err;
  }

  getDb()
    .prepare("DELETE FROM outils WHERE id = ? AND ruche_id = ?")
    .run(id, rucheId);

  return current;
}

export function updateOutil(id, rucheId, { designation, description, icone, ordre }) {
  const current = findOutilById(id);
  if (!current || current.ruche_id !== rucheId) {
    const err = new Error("Outil introuvable.");
    err.status = 404;
    throw err;
  }

  const nextDesignation =
    designation != null ? String(designation).trim() : current.designation;
  const nextDescription =
    description != null ? String(description).trim() : current.description;
  const nextIcone = icone != null ? String(icone).trim() : current.icone;
  const nextOrdre =
    ordre != null && Number.isFinite(Number(ordre))
      ? Number(ordre)
      : current.ordre;

  if (!nextDesignation) {
    const err = new Error("La désignation est obligatoire.");
    err.status = 400;
    throw err;
  }

  getDb()
    .prepare(
      `UPDATE outils
       SET designation = @designation,
           description = @description,
           icone = @icone,
           ordre = @ordre,
           updated_at = datetime('now')
       WHERE id = @id AND ruche_id = @ruche_id`
    )
    .run({
      id,
      ruche_id: rucheId,
      designation: nextDesignation,
      description: nextDescription,
      icone: nextIcone,
      ordre: nextOrdre,
    });

  return findOutilById(id);
}
