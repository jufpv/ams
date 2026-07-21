import path from "node:path";
import { settings, projectRoot } from "../../settings.js";

/** Configuration API dérivée de settings.json (+ settings.private.json). */
export const config = {
  env: settings.env || "development",
  corsOrigin: settings.api?.corsOrigin || "*",
  dbPath: path.resolve(projectRoot, settings.api?.dbPath || "api/data/ams.db"),
  jwtSecret: settings.api?.jwtSecret,
  jwtExpiresIn: settings.api?.jwtExpiresIn || "7d",
  basePath: settings.api?.basePath || "/api",
  routes: settings.routes || {},
  rootDir: path.join(projectRoot, "api"),
  projectRoot,
  uploadsDir: settings.server?.uploadsDir || "uploads",
};

if (!config.jwtSecret) {
  throw new Error(
    "api.jwtSecret manquant : renseignez-le dans settings.private.json " +
      "(voir settings.private.example.json)."
  );
}
