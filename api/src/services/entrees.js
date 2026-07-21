import { getDb } from "../db/index.js";
import { canManageEntree } from "../constants/roles.js";
import {
  DEFAULT_ENTREE_TYPE,
  ENTREE_TYPES,
  ENTREE_TYPE_LABELS,
  isValidEntreeType,
} from "../constants/entrees.js";
import { findOutilForRuche } from "./outils.js";
import {
  deletePiecesJointesForEntree,
  listPiecesJointesByEntree,
} from "./piecesJointes.js";

export const SAMPLE_ENTREES_BY_OUTIL = {
  campagnes: [
    {
      designation: "Présidentielle 2027",
      type: ENTREE_TYPES.LIEN,
      lien: "https://chat.whatsapp.com/coordination",
    },
    {
      designation: "Tracts Région Sud",
      type: ENTREE_TYPES.LIEN,
      lien: "https://drive.google.com/drive/folders/tracts-sud",
    },
    {
      designation: "Réunion Bureau",
      type: ENTREE_TYPES.LIEN,
      lien: "https://outlook.office.com/calendar/reunion-bureau",
    },
    {
      designation: "Kit réseaux sociaux",
      type: ENTREE_TYPES.LIEN,
      lien: "https://www.dropbox.com/sh/kit-reseaux",
    },
    {
      designation: "Pétition Hôpital",
      type: ENTREE_TYPES.LIEN,
      lien: "https://petition.example.org/hopital",
    },
    {
      designation: "Équipe communication",
      type: ENTREE_TYPES.LIEN,
      lien: "https://chat.whatsapp.com/equipe-com",
    },
  ],
  adherents: [
    {
      designation: "Fichier adhérents national",
      type: ENTREE_TYPES.LIEN,
      lien: "https://drive.google.com/drive/folders/adherents",
    },
    {
      designation: "Formulaire d'adhésion",
      type: ENTREE_TYPES.LIEN,
      lien: "https://forms.example.org/adhesion",
    },
  ],
  evenements: [
    {
      designation: "Agenda des réunions",
      type: ENTREE_TYPES.LIEN,
      lien: "https://outlook.office.com/calendar/reunions",
    },
  ],
  communication: [
    {
      designation: "Groupe WhatsApp communication",
      type: ENTREE_TYPES.LIEN,
      lien: "https://chat.whatsapp.com/communication",
    },
  ],
  parrainages: [
    {
      designation: "Suivi des signatures",
      type: ENTREE_TYPES.LIEN,
      lien: "https://docs.google.com/spreadsheets/parrainages",
    },
  ],
  finances: [
    {
      designation: "Tableau des dons",
      type: ENTREE_TYPES.LIEN,
      lien: "https://docs.google.com/spreadsheets/dons",
    },
  ],
};

const ENTREE_SELECT = `
  SELECT
    e.id,
    e.outil_id,
    e.designation,
    e.type,
    e.lien,
    e.contenu,
    e.ordre,
    e.created_by,
    e.created_at,
    e.updated_at,
    u.prenom AS createur_prenom,
    u.nom AS createur_nom,
    u.email AS createur_email
  FROM entrees e
  LEFT JOIN users u ON u.id = e.created_by
`;

function normalizeType(type, fallback = DEFAULT_ENTREE_TYPE) {
  const value = String(type || fallback).trim();
  if (!isValidEntreeType(value)) {
    const err = new Error(
      `Type invalide. Valeurs possibles : ${Object.values(ENTREE_TYPE_LABELS).join(", ")}.`
    );
    err.status = 400;
    throw err;
  }
  return value;
}

function resolveContentFields(type, payload, existing = null) {
  if (type === ENTREE_TYPES.NOTE) {
    const contenu =
      payload.contenu !== undefined
        ? String(payload.contenu || "").trim()
        : existing
          ? String(existing.contenu || "").trim()
          : "";
    return { lien: "", contenu };
  }

  const lien =
    payload.lien !== undefined
      ? String(payload.lien || "").trim()
      : existing
        ? String(existing.lien || "").trim()
        : "";
  return { lien, contenu: "" };
}

function mapEntree(row, user = null, { outilCode = null, withPieces = false } = {}) {
  if (!row) return null;
  const type = isValidEntreeType(row.type) ? row.type : DEFAULT_ENTREE_TYPE;
  const mapped = {
    id: row.id,
    outil_id: row.outil_id,
    designation: row.designation,
    type,
    type_label: ENTREE_TYPE_LABELS[type] || type,
    lien: row.lien || "",
    contenu: row.contenu || "",
    ordre: row.ordre,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    createur:
      row.created_by == null
        ? null
        : {
            id: row.created_by,
            prenom: row.createur_prenom,
            nom: row.createur_nom,
            email: row.createur_email,
          },
    can_edit: user ? canManageEntree(user, row) : false,
  };

  if (withPieces) {
    mapped.pieces_jointes = listPiecesJointesByEntree(row.id, { outilCode });
  }

  return mapped;
}

export function listEntreesByOutil(outilId, { q = "", user = null } = {}) {
  const query = String(q || "").trim();
  let rows;

  if (!query) {
    rows = getDb()
      .prepare(
        `${ENTREE_SELECT}
         WHERE e.outil_id = ?
         ORDER BY e.ordre ASC, e.id ASC`
      )
      .all(outilId);
  } else {
    const like = `%${query}%`;
    rows = getDb()
      .prepare(
        `${ENTREE_SELECT}
         WHERE e.outil_id = ?
           AND (
             e.designation LIKE ? COLLATE NOCASE
             OR e.lien LIKE ? COLLATE NOCASE
             OR e.contenu LIKE ? COLLATE NOCASE
           )
         ORDER BY e.ordre ASC, e.id ASC`
      )
      .all(outilId, like, like, like);
  }

  return rows.map((row) => mapEntree(row, user));
}

export function findEntreeForOutil(outilId, entreeId) {
  return getDb()
    .prepare(
      `${ENTREE_SELECT}
       WHERE e.outil_id = ? AND e.id = ?`
    )
    .get(outilId, entreeId);
}

export function ensureEntreesForOutils(outils) {
  const db = getDb();
  const countStmt = db.prepare(
    "SELECT COUNT(*) AS n FROM entrees WHERE outil_id = ?"
  );
  const insert = db.prepare(`
    INSERT INTO entrees (outil_id, designation, type, lien, contenu, ordre, created_by)
    VALUES (@outil_id, @designation, @type, @lien, @contenu, @ordre, NULL)
  `);

  const seed = db.transaction(() => {
    for (const outil of outils) {
      const count = countStmt.get(outil.id).n;
      if (count > 0) continue;

      const samples = SAMPLE_ENTREES_BY_OUTIL[outil.code] || [];
      samples.forEach((entree, index) => {
        insert.run({
          outil_id: outil.id,
          designation: entree.designation,
          type: entree.type || DEFAULT_ENTREE_TYPE,
          lien: entree.lien || "",
          contenu: entree.contenu || "",
          ordre: index + 1,
        });
      });
    }
  });

  seed();
}

export function getOutilEntreesForRuche(
  rucheId,
  idOrCode,
  { q = "", user = null } = {}
) {
  const outil = findOutilForRuche(rucheId, idOrCode);
  if (!outil) {
    const err = new Error("Outil introuvable.");
    err.status = 404;
    throw err;
  }

  const entrees = listEntreesByOutil(outil.id, { q, user });
  return { outil, entrees };
}

function nextOrdre(outilId) {
  const row = getDb()
    .prepare(
      "SELECT COALESCE(MAX(ordre), 0) AS max_ordre FROM entrees WHERE outil_id = ?"
    )
    .get(outilId);
  return Number(row.max_ordre || 0) + 1;
}

export function getEntreeForRuche(rucheId, idOrCode, entreeId, user = null) {
  const outil = findOutilForRuche(rucheId, idOrCode);
  if (!outil) {
    const err = new Error("Outil introuvable.");
    err.status = 404;
    throw err;
  }

  const row = findEntreeForOutil(outil.id, entreeId);
  if (!row) {
    const err = new Error("Entrée introuvable.");
    err.status = 404;
    throw err;
  }

  return { outil, entree: mapEntree(row, user, { outilCode: outil.code, withPieces: true }) };
}

export function createEntree(rucheId, idOrCode, user, payload = {}) {
  const outil = findOutilForRuche(rucheId, idOrCode);
  if (!outil) {
    const err = new Error("Outil introuvable.");
    err.status = 404;
    throw err;
  }

  const designation = String(payload.designation || "").trim();
  if (!designation) {
    const err = new Error("La désignation est obligatoire.");
    err.status = 400;
    throw err;
  }

  const type = normalizeType(payload.type);
  const { lien, contenu } = resolveContentFields(type, payload);
  const ordre =
    payload.ordre != null && payload.ordre !== ""
      ? Number(payload.ordre)
      : nextOrdre(outil.id);

  const result = getDb()
    .prepare(
      `INSERT INTO entrees (outil_id, designation, type, lien, contenu, ordre, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(outil.id, designation, type, lien, contenu, ordre, user.id);

  const row = findEntreeForOutil(outil.id, result.lastInsertRowid);
  return mapEntree(row, user);
}

export function updateEntree(rucheId, idOrCode, entreeId, user, payload = {}) {
  const outil = findOutilForRuche(rucheId, idOrCode);
  if (!outil) {
    const err = new Error("Outil introuvable.");
    err.status = 404;
    throw err;
  }

  const existing = findEntreeForOutil(outil.id, entreeId);
  if (!existing) {
    const err = new Error("Entrée introuvable.");
    err.status = 404;
    throw err;
  }

  if (!canManageEntree(user, existing)) {
    const err = new Error(
      "Seul le créateur de l'entrée ou une Reine peut la modifier."
    );
    err.status = 403;
    throw err;
  }

  const designation =
    payload.designation !== undefined
      ? String(payload.designation || "").trim()
      : existing.designation;
  if (!designation) {
    const err = new Error("La désignation est obligatoire.");
    err.status = 400;
    throw err;
  }

  const type = normalizeType(
    payload.type !== undefined ? payload.type : existing.type,
    existing.type || DEFAULT_ENTREE_TYPE
  );
  const { lien, contenu } = resolveContentFields(type, payload, existing);

  getDb()
    .prepare(
      `UPDATE entrees
       SET designation = ?, type = ?, lien = ?, contenu = ?, updated_at = datetime('now')
       WHERE id = ? AND outil_id = ?`
    )
    .run(designation, type, lien, contenu, existing.id, outil.id);

  const row = findEntreeForOutil(outil.id, existing.id);
  return mapEntree(row, user);
}

export function deleteEntree(rucheId, idOrCode, entreeId, user) {
  const outil = findOutilForRuche(rucheId, idOrCode);
  if (!outil) {
    const err = new Error("Outil introuvable.");
    err.status = 404;
    throw err;
  }

  const existing = findEntreeForOutil(outil.id, entreeId);
  if (!existing) {
    const err = new Error("Entrée introuvable.");
    err.status = 404;
    throw err;
  }

  if (!canManageEntree(user, existing)) {
    const err = new Error(
      "Seul le créateur de l'entrée ou une Reine peut la supprimer."
    );
    err.status = 403;
    throw err;
  }

  deletePiecesJointesForEntree(existing.id);

  getDb()
    .prepare("DELETE FROM entrees WHERE id = ? AND outil_id = ?")
    .run(existing.id, outil.id);

  return mapEntree(existing, user);
}
