import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = __dirname;

function readJson(filename, { required = true } = {}) {
  const filePath = path.join(projectRoot, filename);
  if (!fs.existsSync(filePath)) {
    if (!required) return {};
    throw new Error(
      `Fichier manquant : ${filename}. ` +
        (filename === "settings.private.json"
          ? "Copiez settings.private.example.json vers settings.private.json."
          : "")
    );
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function deepMerge(base, overlay) {
  if (!overlay || typeof overlay !== "object" || Array.isArray(overlay)) {
    return overlay === undefined ? base : overlay;
  }
  const result = { ...(base && typeof base === "object" ? base : {}) };
  for (const [key, value] of Object.entries(overlay)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const publicSettings = readJson("settings.json");
const privateSettings = readJson("settings.private.json");

/** Configuration fusionnée (publique + privée). */
export const settings = deepMerge(publicSettings, privateSettings);
