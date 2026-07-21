import express from "express";
import cors from "cors";
import path from "node:path";
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

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin === "*" ? true : config.corsOrigin,
    })
  );
  app.use(express.json());

  app.use("/api", apiRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/roles", rolesRouter);
  app.use("/api/ruches", ruchesRouter);
  app.use("/api/outils", outilsRouter);
  app.use("/api/adherents", requireAuth, adherentsRouter);
  app.use("/api/evenements", requireAuth, evenementsRouter);

  app.use(express.static(config.appDir));

  app.get("/", (_req, res) => {
    res.sendFile(path.join(config.appDir, "index.html"));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
