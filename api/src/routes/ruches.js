import { Router } from "express";
import { findRucheById } from "../services/ruches.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, (req, res) => {
  if (!req.user?.ruche_id) {
    return res.status(404).json({
      error: "Not Found",
      message: "Aucune ruche rattachée.",
    });
  }

  const ruche = findRucheById(req.user.ruche_id);
  if (!ruche) {
    return res.status(404).json({
      error: "Not Found",
      message: "Ruche introuvable.",
    });
  }

  res.json({ data: ruche });
});

export default router;
