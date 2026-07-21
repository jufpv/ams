import express from "express";
import cors from "cors";
import { config } from "./config.js";
import apiRouter from "./routes/index.js";
import authRouter from "./routes/auth.js";
import rolesRouter from "./routes/roles.js";
import ruchesRouter from "./routes/ruches.js";
import outilsRouter from "./routes/outils.js";
import adherentsRouter from "./routes/adherents.js";
import evenementsRouter from "./routes/evenements.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const routes = config.routes;

/**
 * Routeur API uniquement (à monter sur `config.basePath` par le serveur hôte).
 */
export function createApiRouter() {
  const router = express.Router();

  router.use(
    cors({
      origin: config.corsOrigin === "*" ? true : config.corsOrigin,
    })
  );
  router.use(express.json());

  router.use(routes.root || "/", apiRouter);
  router.use(routes.auth || "/auth", authRouter);
  router.use(routes.roles || "/roles", rolesRouter);
  router.use(routes.ruches || "/ruches", ruchesRouter);
  router.use(routes.outils || "/outils", outilsRouter);
  router.use(routes.adherents || "/adherents", requireAuth, adherentsRouter);
  router.use(routes.evenements || "/evenements", requireAuth, evenementsRouter);

  router.use(notFoundHandler);
  router.use(errorHandler);

  return router;
}
