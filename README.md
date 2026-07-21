# AMS — Espace mouvement citoyen

Application web pour les espaces de travail locaux (« ruches ») d’un mouvement citoyen. Chaque utilisateur appartient à une ruche, dispose d’un rôle d’abeille, et accède à des outils configurables (cartes sur l’accueil, listes d’entrées, paramètres).

## Stack

| Couche | Techno |
|--------|--------|
| Frontend | HTML / CSS / JS (modules ES), servi en statique |
| Backend | Node.js ≥ 18, Express 5 |
| Auth | JWT (`Authorization: Bearer …`) |
| BDD | SQLite (`better-sqlite3`) |

Le serveur API sert aussi le frontend depuis `app/` sur le même origine.

## Démarrage

```bash
cd api
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

- Application : [http://127.0.0.1:3001](http://127.0.0.1:3001)
- Login : [http://127.0.0.1:3001/login.html](http://127.0.0.1:3001/login.html)

Variables d’environnement : voir `api/.env.example`.

## Comptes de démonstration

| Email | Mot de passe | Rôle | Ruche |
|-------|--------------|------|-------|
| `abeille@ruches.org` | `abeille` | Maçonne | Ruche 10-58-89 |
| `reine@ruches.org` | `reine` | Reine | Ruche 10-58-89 |

## Concepts

### Ruche

Espace de travail local (ex. `10-58-89`). Les utilisateurs, adhérents, événements et outils sont scopés par `ruche_id`.

### Rôles (abeilles)

| Rôle | Droits |
|------|--------|
| **Butineuse** | Rôle par défaut — consultation |
| **Maçonne** | Consultation (compte de test) |
| **Reine** | Seule à pouvoir ajouter, modifier et supprimer des **outils** |

Côté UI, les actions non autorisées restent visibles mais désactivées / grisées.

### Outils

Chaque outil a une désignation, une description, une icône et un code. Affichés sur l’accueil ; page détail (`outil.html?code=…`) avec une liste d’**entrées** (désignation + lien), filtrable.

## Structure du dépôt

```
ams/
├── app/                 # Frontend statique
│   ├── index.html       # Accueil (cartes outils)
│   ├── login.html
│   ├── parametres.html  # Config des outils
│   ├── profil.html
│   ├── outil.html       # Liste des entrées d’un outil
│   ├── auth.js          # Session + appels API
│   ├── style.css
│   └── icons/
├── api/                 # Backend Express + SQLite
│   ├── src/
│   │   ├── app.js
│   │   ├── config.js
│   │   ├── db/          # schema, migrate, seed
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── constants/
│   ├── data/            # ams.db (gitignored)
│   └── README.md        # Détail API / endpoints
├── AGENTS.md            # Contexte pour les agents IA
└── README.md
```

## Pages frontend

| Page | Rôle |
|------|------|
| `index.html` | Accueil, menu, cartes outils dynamiques |
| `login.html` | Connexion |
| `parametres.html` | CRUD outils (Reine) |
| `outil.html` | Entrées d’un outil + recherche |
| `profil.html` | Infos personnelles + déconnexion |

La session (token JWT + user) est stockée dans `localStorage` via `app/auth.js`.

## API (aperçu)

Documentation détaillée : [`api/README.md`](api/README.md).

| Méthode | Route | Auth | Notes |
|---------|-------|------|-------|
| GET | `/api/health` | non | Santé serveur / BDD |
| POST | `/api/auth/login` | non | email + password |
| GET / PATCH | `/api/auth/me` | oui | Profil |
| GET | `/api/ruches/me` | oui | Ruche courante |
| GET | `/api/outils` | oui | Outils de la ruche |
| POST / PATCH / DELETE | `/api/outils`… | oui (**Reine**) | Gestion outils |
| GET | `/api/outils/:code/entrees` | oui | Entrées (`?q=`) |
| GET | `/api/adherents` | oui | Adhérents |
| GET | `/api/evenements` | oui | Événements |

## Scripts API

```bash
npm start        # Production
npm run dev      # Watch mode
npm run db:migrate
npm run db:seed
```

## Licence

UNLICENSED — usage interne.
