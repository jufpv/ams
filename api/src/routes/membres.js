import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listUsersByRuche } from "../services/auth.js";

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

router.get("/", requireAuth, (req, res, next) => {
  try {
    const rucheId = requireRuche(req, res);
    if (rucheId == null) return;

    const data = listUsersByRuche(rucheId, { q: req.query.q });
    res.json({ data, count: data.length });
  } catch (err) {
    next(err);
  }
});

export default router;
