import { createApp } from "./app.js";
import { config } from "./config.js";
import { getDb, closeDb } from "./db/index.js";

getDb();

const app = createApp();

const server = app.listen(config.port, config.host, () => {
  console.log(`AMS API → http://${config.host}:${config.port}`);
  console.log(`SQLite  → ${config.dbPath}`);
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
