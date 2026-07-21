import { findUserById, verifyToken } from "../services/auth.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentification requise.",
    });
  }

  try {
    const payload = verifyToken(token);
    const user = findUserById(payload.sub);

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Session invalide.",
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Jeton invalide ou expiré.",
    });
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentification requise.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Permissions insuffisantes pour cette action.",
      });
    }

    next();
  };
}
