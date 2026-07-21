import { Router } from "express";
import { ROLE_LIST } from "../constants/roles.js";

const router = Router();

/** Liste des rôles abeilles disponibles (sans permissions associées pour l'instant) */
router.get("/", (_req, res) => {
  res.json({
    data: ROLE_LIST.map((role) => ({
      id: role,
      label: role,
    })),
  });
});

export default router;
