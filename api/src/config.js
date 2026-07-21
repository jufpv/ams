import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env") });

export const config = {
  env: process.env.NODE_ENV || "development",
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT) || 3001,
  corsOrigin: process.env.CORS_ORIGIN || "*",
  dbPath: path.resolve(rootDir, process.env.DB_PATH || "./data/ams.db"),
  jwtSecret: process.env.JWT_SECRET || "ams-dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  appDir: path.resolve(rootDir, "../app"),
  rootDir,
};
