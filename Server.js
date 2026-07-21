/**
 * Point d'entrée unique AMS — serveur HTTP (frontend + API).
 *
 * Usage :
 *   node Server.js
 *   npm start
 *   pm2 start ecosystem.config.cjs
 */
import path from "node:path";
import express from "express";
import { settings, projectRoot } from "./settings.js";
import { createApiRouter } from "./api/src/app.js";
import { config as apiConfig } from "./api/src/config.js";
import { getDb, closeDb } from "./api/src/db/index.js";

const host = settings.server?.host || "127.0.0.1";
const port = Number(settings.server?.port) || 3001;
const appDir = path.resolve(projectRoot, settings.server?.appDir || "app");
const apiBasePath = apiConfig.basePath || "/api";

getDb();

const app = express();

app.use(apiBasePath, createApiRouter());
app.use(express.static(appDir));
app.get("/", (_req, res) => {
  res.sendFile(path.join(appDir, "index.html"));
});

const server = app.listen(port, host, () => {
  console.log(`AMS → http://${host}:${port}`);
  console.log(`  API      ${apiBasePath}/*`);
  console.log(`  Frontend ${appDir}`);
  console.log(`  Uploads  ${path.resolve(projectRoot, settings.server?.uploadsDir || "uploads")}`);
  console.log(`  SQLite   ${apiConfig.dbPath}`);
});

function shutdown(signal) {
  console.log(`\nArrêt (${signal})…`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
