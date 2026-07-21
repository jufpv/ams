import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { ROLES } from "../constants/roles.js";
import {
  createOutil,
  deleteOutil,
  ensureOutilsForRuche,
  findOutilForRuche,
  updateOutil,
  assertOutilListeEntrees,
} from "../services/outils.js";
import {
  createEntree,
  deleteEntree,
  ensureEntreesForOutils,
  getEntreeForRuche,
  getOutilEntreesForRuche,
  updateEntree,
} from "../services/entrees.js";
import {
  ALLOWED_EXTENSIONS,
  createPieceJointe,
  deletePieceJointe,
  getPieceJointeFile,
  listPiecesJointesForRuche,
  MAX_FILE_SIZE,
  uploadsTmpDir,
} from "../services/piecesJointes.js";

const router = Router();
const requireReine = requireRoles(ROLES.REINE);

const upload = multer({
  dest: uploadsTmpDir(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      const err = new Error(
        "Type de fichier non autorisé. Formats acceptés : PNG, JPG, SVG, PDF."
      );
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

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
      type: req.body?.type,
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
      { q: req.query.q, user: req.user }
    );
    assertOutilListeEntrees(outil);

    res.json({
      outil,
      data: entrees,
      count: entrees.length,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:idOrCode/entrees", requireAuth, (req, res, next) => {
  try {
    const rucheId = requireRuche(req, res);
    if (rucheId == null) return;

    ensureOutilsForRuche(rucheId);
    assertOutilListeEntrees(findOutilForRuche(rucheId, req.params.idOrCode));
    const entree = createEntree(rucheId, req.params.idOrCode, req.user, {
      designation: req.body?.designation,
      type: req.body?.type,
      lien: req.body?.lien,
      contenu: req.body?.contenu,
      ordre: req.body?.ordre,
    });

    res.status(201).json({ data: entree });
  } catch (err) {
    next(err);
  }
});

router.get("/:idOrCode/entrees/:entreeId", requireAuth, (req, res, next) => {
  try {
    const rucheId = requireRuche(req, res);
    if (rucheId == null) return;

    ensureOutilsForRuche(rucheId);
    assertOutilListeEntrees(findOutilForRuche(rucheId, req.params.idOrCode));
    const { outil, entree } = getEntreeForRuche(
      rucheId,
      req.params.idOrCode,
      Number(req.params.entreeId),
      req.user
    );

    res.json({ outil, data: entree });
  } catch (err) {
    next(err);
  }
});

router.patch("/:idOrCode/entrees/:entreeId", requireAuth, (req, res, next) => {
  try {
    const rucheId = requireRuche(req, res);
    if (rucheId == null) return;

    ensureOutilsForRuche(rucheId);
    assertOutilListeEntrees(findOutilForRuche(rucheId, req.params.idOrCode));
    const entree = updateEntree(
      rucheId,
      req.params.idOrCode,
      Number(req.params.entreeId),
      req.user,
      {
        designation: req.body?.designation,
        type: req.body?.type,
        lien: req.body?.lien,
        contenu: req.body?.contenu,
      }
    );

    res.json({ data: entree });
  } catch (err) {
    next(err);
  }
});

router.get(
  "/:idOrCode/entrees/:entreeId/pieces-jointes",
  requireAuth,
  (req, res, next) => {
    try {
      const rucheId = requireRuche(req, res);
      if (rucheId == null) return;

      ensureOutilsForRuche(rucheId);
      assertOutilListeEntrees(findOutilForRuche(rucheId, req.params.idOrCode));
      const { pieces } = listPiecesJointesForRuche(
        rucheId,
        req.params.idOrCode,
        Number(req.params.entreeId)
      );
      res.json({ data: pieces, count: pieces.length });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:idOrCode/entrees/:entreeId/pieces-jointes",
  requireAuth,
  (req, res, next) => {
    upload.single("fichier")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            err.status = 400;
            err.message = "Fichier trop volumineux (max. 10 Mo).";
          } else {
            err.status = 400;
          }
        }
        return next(err);
      }

      try {
        const rucheId = requireRuche(req, res);
        if (rucheId == null) return;

        ensureOutilsForRuche(rucheId);
        assertOutilListeEntrees(findOutilForRuche(rucheId, req.params.idOrCode));
        const piece = createPieceJointe(
          rucheId,
          req.params.idOrCode,
          Number(req.params.entreeId),
          req.user,
          req.file
        );
        res.status(201).json({ data: piece });
      } catch (error) {
        next(error);
      }
    });
  }
);

router.get(
  "/:idOrCode/entrees/:entreeId/pieces-jointes/:pieceId/fichier",
  requireAuth,
  (req, res, next) => {
    try {
      const rucheId = requireRuche(req, res);
      if (rucheId == null) return;

      ensureOutilsForRuche(rucheId);
      assertOutilListeEntrees(findOutilForRuche(rucheId, req.params.idOrCode));
      const { filePath, mime, downloadName } = getPieceJointeFile(
        rucheId,
        req.params.idOrCode,
        Number(req.params.entreeId),
        Number(req.params.pieceId)
      );

      res.setHeader("Content-Type", mime);
      res.setHeader(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(downloadName)}`
      );
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/:idOrCode/entrees/:entreeId/pieces-jointes/:pieceId",
  requireAuth,
  (req, res, next) => {
    try {
      const rucheId = requireRuche(req, res);
      if (rucheId == null) return;

      ensureOutilsForRuche(rucheId);
      assertOutilListeEntrees(findOutilForRuche(rucheId, req.params.idOrCode));
      const piece = deletePieceJointe(
        rucheId,
        req.params.idOrCode,
        Number(req.params.entreeId),
        Number(req.params.pieceId),
        req.user
      );
      res.json({ data: piece, deleted: true });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/:idOrCode/entrees/:entreeId", requireAuth, (req, res, next) => {
  try {
    const rucheId = requireRuche(req, res);
    if (rucheId == null) return;

    ensureOutilsForRuche(rucheId);
    assertOutilListeEntrees(findOutilForRuche(rucheId, req.params.idOrCode));
    const entree = deleteEntree(
      rucheId,
      req.params.idOrCode,
      Number(req.params.entreeId),
      req.user
    );

    res.json({ data: entree, deleted: true });
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
      type: req.body?.type,
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
