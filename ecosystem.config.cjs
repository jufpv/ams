/**
 * Configuration PM2 — démarrage prod du serveur unique.
 *
 *   pm2 start ecosystem.config.cjs
 *   pm2 logs ams
 *   pm2 restart ams
 *
 * Host / port / secrets : settings.json + settings.private.json
 */
module.exports = {
  apps: [
    {
      name: "ams",
      script: "Server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
    },
  ],
};
