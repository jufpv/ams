import { Router } from "express";
import {
  findUserByEmail,
  signToken,
  toPublicUser,
  updateUserProfile,
  verifyPassword,
} from "../services/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/login", (req, res) => {
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Email et mot de passe requis.",
    });
  }

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Identifiants incorrects.",
    });
  }

  const token = signToken(user);

  res.json({
    token,
    user: toPublicUser(user),
  });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

router.patch("/me", requireAuth, (req, res, next) => {
  try {
    const user = updateUserProfile(req.user.id, {
      prenom: req.body?.prenom,
      nom: req.body?.nom,
      email: req.body?.email,
      password: req.body?.password,
    });

    const token = signToken(user);

    res.json({
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
