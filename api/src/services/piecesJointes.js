import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getDb } from "../db/index.js";
import { config } from "../config.js";
import { canManageEntree } from "../constants/roles.js";
import { findOutilForRuche } from "./outils.js";
import { findEntreeForOutil } from "./entrees.js";

export const ALLOWED_EXTENSIONS = Object.freeze([
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".pdf",
]);

export const ALLOWED_MIME_TYPES = Object.freeze([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "application/pdf",
]);

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

const MIME_BY_EXT = Object.freeze({
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
});

export function uploadsRoot() {
  return path.resolve(
    config.projectRoot,
    config.uploadsDir || "uploads"
  );
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function extensionOf(filename) {
  return path.extname(String(filename || "")).toLowerCase();
}

export function isAllowedUpload({ originalname, mimetype }) {
  const ext = extensionOf(originalname);
  if (!ALLOWED_EXTENSIONS.includes(ext)) return false;
  const mime = String(mimetype || "").toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(mime)) return true;
  // Certains clients envoient application/octet-stream pour SVG
  if (mime === "application/octet-stream" && MIME_BY_EXT[ext]) return true;
  return false;
}

function mapPieceJointe(row, { outilCode, includeUrl = true } = {}) {
  if (!row) return null;
  const item = {
    id: row.id,
    entree_id: row.entree_id,
    nom: row.original_name,
    mime: row.mime_type,
    taille: row.size_bytes,
    created_by: row.created_by,
    created_at: row.created_at,
  };
  if (includeUrl && outilCode != null) {
    item.url = `/api/outils/${encodeURIComponent(outilCode)}/entrees/${row.entree_id}/pieces-jointes/${row.id}/fichier`;
  }
  return item;
}

export function listPiecesJointesByEntree(entreeId, { outilCode = null } = {}) {
  const rows = getDb()
    .prepare(
      `SELECT id, entree_id, original_name, stored_name, mime_type, size_bytes, created_by, created_at
       FROM pieces_jointes
       WHERE entree_id = ?
       ORDER BY id ASC`
    )
    .all(entreeId);
  return rows.map((row) => mapPieceJointe(row, { outilCode }));
}

export function findPieceJointe(entreeId, pieceId) {
  return getDb()
    .prepare(
      `SELECT id, entree_id, original_name, stored_name, mime_type, size_bytes, created_by, created_at
       FROM pieces_jointes
       WHERE entree_id = ? AND id = ?`
    )
    .get(entreeId, pieceId);
}

function absolutePathFor(row) {
  const rootPath = path.join(uploadsRoot(), row.stored_name);
  if (fs.existsSync(rootPath)) return rootPath;

  // Ancien emplacement : uploads/entrees/{id}/…
  const legacyPath = path.join(
    uploadsRoot(),
    "entrees",
    String(row.entree_id),
    row.stored_name
  );
  if (fs.existsSync(legacyPath)) return legacyPath;

  return rootPath;
}

function resolveEntreeContext(rucheId, idOrCode, entreeId) {
  const outil = findOutilForRuche(rucheId, idOrCode);
  if (!outil) {
    const err = new Error("Outil introuvable.");
    err.status = 404;
    throw err;
  }

  const entree = findEntreeForOutil(outil.id, entreeId);
  if (!entree) {
    const err = new Error("Entrée introuvable.");
    err.status = 404;
    throw err;
  }

  return { outil, entree };
}

export function listPiecesJointesForRuche(rucheId, idOrCode, entreeId) {
  const { outil, entree } = resolveEntreeContext(rucheId, idOrCode, entreeId);
  return {
    outil,
    entree,
    pieces: listPiecesJointesByEntree(entree.id, { outilCode: outil.code }),
  };
}

export function createPieceJointe(rucheId, idOrCode, entreeId, user, file) {
  const { outil, entree } = resolveEntreeContext(rucheId, idOrCode, entreeId);

  if (!canManageEntree(user, entree)) {
    const err = new Error(
      "Seul le créateur de l'entrée ou une Reine peut ajouter une pièce jointe."
    );
    err.status = 403;
    throw err;
  }

  if (!file) {
    const err = new Error("Aucun fichier reçu.");
    err.status = 400;
    throw err;
  }

  if (!isAllowedUpload(file)) {
    const err = new Error(
      "Type de fichier non autorisé. Formats acceptés : PNG, JPG, SVG, PDF."
    );
    err.status = 400;
    throw err;
  }

  if (file.size > MAX_FILE_SIZE) {
    const err = new Error("Fichier trop volumineux (max. 10 Mo).");
    err.status = 400;
    throw err;
  }

  const ext = extensionOf(file.originalname);
  const storedName = `${randomUUID()}${ext}`;
  const dir = uploadsRoot();
  ensureDir(dir);
  const dest = path.join(dir, storedName);

  const sourcePath = file.path || file.filepath;
  if (sourcePath) {
    fs.renameSync(sourcePath, dest);
  } else if (file.buffer) {
    fs.writeFileSync(dest, file.buffer);
  } else {
    const err = new Error("Fichier invalide.");
    err.status = 400;
    throw err;
  }

  const mime = ALLOWED_MIME_TYPES.includes(
    String(file.mimetype || "").toLowerCase()
  )
    ? file.mimetype
    : MIME_BY_EXT[ext];

  const originalName = path.basename(
    String(file.originalname || `fichier${ext}`)
  );

  try {
    const result = getDb()
      .prepare(
        `INSERT INTO pieces_jointes
           (entree_id, original_name, stored_name, mime_type, size_bytes, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        entree.id,
        originalName,
        storedName,
        mime,
        Number(file.size) || fs.statSync(dest).size,
        user.id
      );

    const row = findPieceJointe(entree.id, result.lastInsertRowid);
    return mapPieceJointe(row, { outilCode: outil.code });
  } catch (err) {
    try {
      fs.unlinkSync(dest);
    } catch {
      /* ignore */
    }
    throw err;
  }
}

export function getPieceJointeFile(rucheId, idOrCode, entreeId, pieceId) {
  const { outil, entree } = resolveEntreeContext(rucheId, idOrCode, entreeId);
  const row = findPieceJointe(entree.id, pieceId);
  if (!row) {
    const err = new Error("Pièce jointe introuvable.");
    err.status = 404;
    throw err;
  }

  const filePath = absolutePathFor(row);
  if (!fs.existsSync(filePath)) {
    const err = new Error("Fichier introuvable sur le disque.");
    err.status = 404;
    throw err;
  }

  return {
    outil,
    entree,
    piece: mapPieceJointe(row, { outilCode: outil.code }),
    filePath,
    mime: row.mime_type,
    downloadName: row.original_name,
  };
}

export function deletePieceJointe(rucheId, idOrCode, entreeId, pieceId, user) {
  const { outil, entree } = resolveEntreeContext(rucheId, idOrCode, entreeId);

  if (!canManageEntree(user, entree)) {
    const err = new Error(
      "Seul le créateur de l'entrée ou une Reine peut supprimer une pièce jointe."
    );
    err.status = 403;
    throw err;
  }

  const row = findPieceJointe(entree.id, pieceId);
  if (!row) {
    const err = new Error("Pièce jointe introuvable.");
    err.status = 404;
    throw err;
  }

  getDb()
    .prepare("DELETE FROM pieces_jointes WHERE id = ? AND entree_id = ?")
    .run(row.id, entree.id);

  const filePath = absolutePathFor(row);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }

  return mapPieceJointe(row, { outilCode: outil.code });
}

export function deletePiecesJointesForEntree(entreeId) {
  const rows = getDb()
    .prepare(
      `SELECT id, entree_id, stored_name FROM pieces_jointes WHERE entree_id = ?`
    )
    .all(entreeId);

  getDb().prepare("DELETE FROM pieces_jointes WHERE entree_id = ?").run(entreeId);

  for (const row of rows) {
    try {
      const filePath = absolutePathFor(row);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }
}
