import { Router } from "express";
import { getDb } from "../db/index.js";

const router = Router();

function requireRuche(req, res) {
  if (!req.user?.ruche_id) {
    res.status(403).json({
      error: "Forbidden",
      message: "Aucun espace de travail (ruche) rattaché à cet utilisateur.",
    });
    return null;
  }
  return req.user.ruche_id;
}

router.get("/", (req, res) => {
  const rucheId = requireRuche(req, res);
  if (rucheId == null) return;

  const rows = getDb()
    .prepare(
      `SELECT id, ruche_id, prenom, nom, email, telephone, ville, code_postal, type, created_at, updated_at
       FROM adherents
       WHERE ruche_id = ?
       ORDER BY nom ASC, prenom ASC`
    )
    .all(rucheId);

  res.json({ data: rows, count: rows.length });
});

router.get("/:id", (req, res) => {
  const rucheId = requireRuche(req, res);
  if (rucheId == null) return;

  const row = getDb()
    .prepare(
      `SELECT id, ruche_id, prenom, nom, email, telephone, ville, code_postal, type, created_at, updated_at
       FROM adherents
       WHERE id = ? AND ruche_id = ?`
    )
    .get(Number(req.params.id), rucheId);

  if (!row) {
    return res.status(404).json({
      error: "Not Found",
      message: "Adhérent introuvable.",
    });
  }

  res.json({ data: row });
});

export default router;
