import { getDb } from "../db/index.js";
import {
  DEFAULT_OUTIL_TYPE,
  OUTIL_TYPE_LABELS,
  OUTIL_TYPES,
  normalizeOutilType,
} from "../constants/outils.js";

export const DEFAULT_OUTILS = [
  {
    code: "adherents",
    designation: "Adhérents",
    description: "Gérez vos adhérents et sympathisants",
    icone: "icons/adherents.svg",
    type: OUTIL_TYPES.LISTE_ENTREES,
    ordre: 1,
  },
  {
    code: "evenements",
    designation: "Événements",
    description: "Organisez et suivez vos événements",
    icone: "icons/evenements.svg",
    type: OUTIL_TYPES.LISTE_ENTREES,
    ordre: 2,
  },
  {
    code: "communication",
    designation: "Communication",
    description: "Diffusez vos messages et actualités",
    icone: "icons/communication.svg",
    type: OUTIL_TYPES.LISTE_ENTREES,
    ordre: 3,
  },
  {
    code: "parrainages",
    designation: "Parrainages",
    description: "Suivez vos parrainages et signatures",
    icone: "icons/parrainages.svg",
    type: OUTIL_TYPES.LISTE_ENTREES,
    ordre: 4,
  },
  {
    code: "campagnes",
    designation: "Campagnes",
    description: "Créez et gérez vos campagnes",
    icone: "icons/action.svg",
    type: OUTIL_TYPES.LISTE_ENTREES,
    ordre: 5,
  },
  {
    code: "finances",
    designation: "Finances",
    description: "Suivez vos dons et dépenses",
    icone: "icons/finances.svg",
    type: OUTIL_TYPES.LISTE_ENTREES,
    ordre: 6,
  },
  {
    code: "membre",
    designation: "Membre",
    description: "Utilisateurs de l'espace de travail",
    icone: "icons/membre.svg",
    type: OUTIL_TYPES.MEMBRES,
    ordre: 7,
  },
];

const OUTIL_SELECT = `
  SELECT id, ruche_id, code, designation, description, icone, type, ordre, created_at, updated_at
  FROM outils
`;

function mapOutil(row) {
  if (!row) return null;
  const type = normalizeOutilType(row.type);
  return {
    ...row,
    type,
    type_label: OUTIL_TYPE_LABELS[type] || type,
  };
}

export function listOutilsByRuche(rucheId) {
  return getDb()
    .prepare(
      `${OUTIL_SELECT}
       WHERE ruche_id = ?
       ORDER BY ordre ASC, id ASC`
    )
    .all(rucheId)
    .map(mapOutil);
}

export function findOutilById(id) {
  return mapOutil(
    getDb()
      .prepare(`${OUTIL_SELECT} WHERE id = ?`)
      .get(id)
  );
}

export function findOutilByCode(rucheId, code) {
  return mapOutil(
    getDb()
      .prepare(`${OUTIL_SELECT} WHERE ruche_id = ? AND code = ?`)
      .get(rucheId, code)
  );
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

  // Ne recrée pas les outils absents : une suppression depuis les réglages doit rester effective.
  if (existing.length > 0) {
    const membre = existing.find((outil) => outil.code === "membre");
    if (membre && membre.type !== OUTIL_TYPES.MEMBRES) {
      getDb()
        .prepare(
          `UPDATE outils
           SET type = ?, updated_at = datetime('now')
           WHERE id = ? AND ruche_id = ?`
        )
        .run(OUTIL_TYPES.MEMBRES, membre.id, rucheId);
      return listOutilsByRuche(rucheId);
    }
    return existing;
  }

  const insert = getDb().prepare(`
    INSERT INTO outils (ruche_id, code, designation, description, icone, type, ordre)
    VALUES (@ruche_id, @code, @designation, @description, @icone, @type, @ordre)
  `);

  const seed = getDb().transaction(() => {
    for (const outil of DEFAULT_OUTILS) {
      insert.run({
        ruche_id: rucheId,
        code: outil.code,
        designation: outil.designation,
        description: outil.description,
        icone: outil.icone,
        type: outil.type || DEFAULT_OUTIL_TYPE,
        ordre: outil.ordre,
      });
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
  {
    designation,
    description = "",
    icone = "",
    code = null,
    type = DEFAULT_OUTIL_TYPE,
    ordre = null,
  }
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
  const nextType = normalizeOutilType(type);

  const maxOrdre = getDb()
    .prepare("SELECT COALESCE(MAX(ordre), 0) AS max FROM outils WHERE ruche_id = ?")
    .get(rucheId).max;

  const nextOrdre =
    ordre != null && Number.isFinite(Number(ordre))
      ? Number(ordre)
      : maxOrdre + 1;

  const result = getDb()
    .prepare(
      `INSERT INTO outils (ruche_id, code, designation, description, icone, type, ordre)
       VALUES (@ruche_id, @code, @designation, @description, @icone, @type, @ordre)`
    )
    .run({
      ruche_id: rucheId,
      code: nextCode,
      designation: nextDesignation,
      description: nextDescription,
      icone: nextIcone,
      type: nextType,
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

export function updateOutil(
  id,
  rucheId,
  { designation, description, icone, type, ordre }
) {
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
  const nextType =
    type != null ? normalizeOutilType(type, current.type) : current.type;
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
           type = @type,
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
      type: nextType,
      ordre: nextOrdre,
    });

  return findOutilById(id);
}

export function assertOutilListeEntrees(outil) {
  if (!outil) return;
  if (normalizeOutilType(outil.type) === OUTIL_TYPES.MEMBRES) {
    const err = new Error(
      "Cet outil est de type Membres et n'utilise pas les entrées."
    );
    err.status = 400;
    throw err;
  }
}
