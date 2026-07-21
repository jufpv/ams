import { getDb } from "../db/index.js";
import { findOutilForRuche } from "./outils.js";

export const SAMPLE_ENTREES_BY_OUTIL = {
  campagnes: [
    {
      designation: "Présidentielle 2027",
      lien: "https://chat.whatsapp.com/coordination",
    },
    {
      designation: "Tracts Région Sud",
      lien: "https://drive.google.com/drive/folders/tracts-sud",
    },
    {
      designation: "Réunion Bureau",
      lien: "https://outlook.office.com/calendar/reunion-bureau",
    },
    {
      designation: "Kit réseaux sociaux",
      lien: "https://www.dropbox.com/sh/kit-reseaux",
    },
    {
      designation: "Pétition Hôpital",
      lien: "https://petition.example.org/hopital",
    },
    {
      designation: "Équipe communication",
      lien: "https://chat.whatsapp.com/equipe-com",
    },
  ],
  adherents: [
    {
      designation: "Fichier adhérents national",
      lien: "https://drive.google.com/drive/folders/adherents",
    },
    {
      designation: "Formulaire d'adhésion",
      lien: "https://forms.example.org/adhesion",
    },
  ],
  evenements: [
    {
      designation: "Agenda des réunions",
      lien: "https://outlook.office.com/calendar/reunions",
    },
  ],
  communication: [
    {
      designation: "Groupe WhatsApp communication",
      lien: "https://chat.whatsapp.com/communication",
    },
  ],
  parrainages: [
    {
      designation: "Suivi des signatures",
      lien: "https://docs.google.com/spreadsheets/parrainages",
    },
  ],
  finances: [
    {
      designation: "Tableau des dons",
      lien: "https://docs.google.com/spreadsheets/dons",
    },
  ],
};

export function listEntreesByOutil(outilId, { q = "" } = {}) {
  const query = String(q || "").trim();
  if (!query) {
    return getDb()
      .prepare(
        `SELECT id, outil_id, designation, lien, ordre, created_at, updated_at
         FROM entrees
         WHERE outil_id = ?
         ORDER BY ordre ASC, id ASC`
      )
      .all(outilId);
  }

  const like = `%${query}%`;
  return getDb()
    .prepare(
      `SELECT id, outil_id, designation, lien, ordre, created_at, updated_at
       FROM entrees
       WHERE outil_id = ?
         AND (designation LIKE ? COLLATE NOCASE OR lien LIKE ? COLLATE NOCASE)
       ORDER BY ordre ASC, id ASC`
    )
    .all(outilId, like, like);
}

export function ensureEntreesForOutils(outils) {
  const db = getDb();
  const countStmt = db.prepare(
    "SELECT COUNT(*) AS n FROM entrees WHERE outil_id = ?"
  );
  const insert = db.prepare(`
    INSERT INTO entrees (outil_id, designation, lien, ordre)
    VALUES (@outil_id, @designation, @lien, @ordre)
  `);

  const seed = db.transaction(() => {
    for (const outil of outils) {
      const count = countStmt.get(outil.id).n;
      if (count > 0) continue;

      const samples = SAMPLE_ENTREES_BY_OUTIL[outil.code] || [];
      samples.forEach((entree, index) => {
        insert.run({
          outil_id: outil.id,
          designation: entree.designation,
          lien: entree.lien,
          ordre: index + 1,
        });
      });
    }
  });

  seed();
}

export function getOutilEntreesForRuche(rucheId, idOrCode, { q = "" } = {}) {
  const outil = findOutilForRuche(rucheId, idOrCode);
  if (!outil) {
    const err = new Error("Outil introuvable.");
    err.status = 404;
    throw err;
  }

  const entrees = listEntreesByOutil(outil.id, { q });
  return { outil, entrees };
}
