import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import {
  createOutil,
  deleteOutil,
  ensureOutilsForRuche,
  findOutilForRuche,
  listOutilsByRuche,
  updateOutil,
} from "../services/outils.js";
import {
  ensureEntreesForOutils,
  getOutilEntreesForRuche,
} from "../services/entrees.js";

const router = Router();
const requireReine = requireRoles(ROLES.REINE);

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

router.get("/", requireAuth, (req, res) => {
  const rucheId = requireRuche(req, res);
  if (rucheId == null) return;

  const rows = ensureOutilsForRuche(rucheId);
  ensureEntreesForOutils(rows);
  res.json({ data: rows, count: rows.length });
});

router.post("/", requireAuth, requireReine, (req, res, next) => {
  try {
    const rucheId = requireRuche(req, res);
    if (rucheId == null) return;

    const outil = createOutil(rucheId, {
      designation: req.body?.designation,
      description: req.body?.description,
      icone: req.body?.icone,
      code: req.body?.code,
      ordre: req.body?.ordre,
    });

    res.status(201).json({ data: outil });
  } catch (err) {
    next(err);
  }
});

router.get("/:idOrCode/entrees", requireAuth, (req, res, next) => {
  try {
    const rucheId = requireRuche(req, res);
    if (rucheId == null) return;

    ensureOutilsForRuche(rucheId);
    const { outil, entrees } = getOutilEntreesForRuche(
      rucheId,
      req.params.idOrCode,
      { q: req.query.q }
    );

    res.json({
      outil,
      data: entrees,
      count: entrees.length,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:idOrCode", requireAuth, (req, res, next) => {
  try {
    const rucheId = requireRuche(req, res);
    if (rucheId == null) return;

    ensureOutilsForRuche(rucheId);
    const outil = findOutilForRuche(rucheId, req.params.idOrCode);
    if (!outil) {
      return res.status(404).json({
        error: "Not Found",
        message: "Outil introuvable.",
      });
    }

    res.json({ data: outil });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requireAuth, requireReine, (req, res, next) => {
  try {
    const rucheId = requireRuche(req, res);
    if (rucheId == null) return;

    const outil = updateOutil(Number(req.params.id), rucheId, {
      designation: req.body?.designation,
      description: req.body?.description,
      icone: req.body?.icone,
      ordre: req.body?.ordre,
    });

    res.json({ data: outil });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, requireReine, (req, res, next) => {
  try {
    const rucheId = requireRuche(req, res);
    if (rucheId == null) return;

    const outil = deleteOutil(Number(req.params.id), rucheId);
    res.json({ data: outil, deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
