import { getDb, closeDb } from "./index.js";
import { ensureUser } from "../services/auth.js";
import { ensureRuche } from "../services/ruches.js";
import { ensureOutilsForRuche } from "../services/outils.js";
import { ensureEntreesForOutils } from "../services/entrees.js";

function seed() {
  const db = getDb();

  const ruche = ensureRuche({
    code: "10-58-89",
    nom: "Ruche 10-58-89",
    description: "Espace de travail de démonstration",
  });
  console.log(`Ruche OK → ${ruche.nom}`);

  const testUser = ensureUser({
    email: "abeille@ruches.org",
    password: "abeille",
    prenom: "Abeille",
    nom: "Ruches",
    role: "Maçonne",
    ruche_id: ruche.id,
  });
  console.log(`Compte test OK → ${testUser.email} (${ruche.nom}, ${testUser.role})`);

  const reineUser = ensureUser({
    email: "reine@ruches.org",
    password: "reine",
    prenom: "Reine",
    nom: "Ruches",
    role: "Reine",
    ruche_id: ruche.id,
  });
  console.log(`Compte reine OK → ${reineUser.email} (${ruche.nom}, ${reineUser.role})`);

  const outils = ensureOutilsForRuche(ruche.id);
  ensureEntreesForOutils(outils);
  console.log(`Outils OK → ${outils.length} outil(s) pour ${ruche.nom}`);

  db.prepare(
    `UPDATE adherents SET ruche_id = ? WHERE ruche_id IS NULL`
  ).run(ruche.id);
  db.prepare(
    `UPDATE evenements SET ruche_id = ? WHERE ruche_id IS NULL`
  ).run(ruche.id);

  const count = db
    .prepare("SELECT COUNT(*) AS n FROM adherents WHERE ruche_id = ?")
    .get(ruche.id).n;

  if (count > 0) {
    console.log("Seed adhérents ignoré : données déjà présentes pour la ruche.");
    closeDb();
    return;
  }

  const insertAdherent = db.prepare(`
    INSERT INTO adherents (ruche_id, prenom, nom, email, telephone, ville, code_postal, type)
    VALUES (@ruche_id, @prenom, @nom, @email, @telephone, @ville, @code_postal, @type)
  `);

  const insertEvenement = db.prepare(`
    INSERT INTO evenements (ruche_id, titre, description, lieu, date_debut, date_fin)
    VALUES (@ruche_id, @titre, @description, @lieu, @date_debut, @date_fin)
  `);

  const seedAll = db.transaction(() => {
    insertAdherent.run({
      ruche_id: ruche.id,
      prenom: "Camille",
      nom: "Martin",
      email: "camille.martin@example.com",
      telephone: "0612345678",
      ville: "Lyon",
      code_postal: "69001",
      type: "adherent",
    });
    insertAdherent.run({
      ruche_id: ruche.id,
      prenom: "Alex",
      nom: "Bernard",
      email: "alex.bernard@example.com",
      telephone: null,
      ville: "Paris",
      code_postal: "75011",
      type: "sympathisant",
    });

    insertEvenement.run({
      ruche_id: ruche.id,
      titre: "Réunion locale",
      description: "Point d'organisation mensuel",
      lieu: "Maison des associations",
      date_debut: "2026-08-05T18:30:00",
      date_fin: "2026-08-05T20:30:00",
    });
  });

  seedAll();
  console.log("Seed OK : données de démonstration inscrites.");
  closeDb();
}

seed();
