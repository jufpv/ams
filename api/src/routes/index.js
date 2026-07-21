import { Router } from "express";
import { getDb } from "../db/index.js";

const router = Router();

router.get("/health", (_req, res) => {
  try {
    const db = getDb();
    const row = db.prepare("SELECT 1 AS ok").get();
    const meta = db
      .prepare("SELECT value FROM meta WHERE key = 'schema_version'")
      .get();

    res.json({
      status: "ok",
      database: row?.ok === 1 ? "connected" : "unknown",
      schemaVersion: meta?.value ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      database: "unavailable",
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/", (_req, res) => {
  res.json({
    name: "ams-api",
    version: "1.0.0",
    endpoints: {
      health: "GET /api/health",
      login: "POST /api/auth/login",
      me: "GET /api/auth/me",
      updateProfile: "PATCH /api/auth/me",
      roles: "GET /api/roles",
      ruche: "GET /api/ruches/me",
      outils: "GET /api/outils",
      outil: "GET /api/outils/:code",
      entrees: "GET /api/outils/:code/entrees",
      adherents: "GET /api/adherents",
      evenements: "GET /api/evenements",
    },
  });
});

export default router;
