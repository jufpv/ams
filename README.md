# AMS — Espace mouvement citoyen

Application web pour les espaces de travail locaux (« ruches ») d’un mouvement citoyen. Chaque utilisateur appartient à une ruche, dispose d’un rôle d’abeille, et accède à des outils configurables (cartes sur l’accueil, listes d’entrées, paramètres).

## Stack

| Couche | Techno |
|--------|--------|
| Frontend | HTML / CSS / JS (modules ES), servi en statique |
| Backend | Node.js ≥ 18 (prod actuelle : Node 20), Express 5 |
| Auth | JWT (`Authorization: Bearer …`) |
| BDD | SQLite (`better-sqlite3@^12`, compatible Node 20 — ne pas remonter en v13 sans Node ≥ 22) |

Le serveur unique (`Server.js`) sert le frontend et monte l’API sur `/api` (même origine). En HTTP/HTTPS, le frontend appelle **`/api`** (compatible reverse proxy nginx). Override possible via `window.AMS_API_BASE`.

## Démarrage

```bash
npm install          # racine + api (postinstall)
cp settings.private.example.json settings.private.json
npm run db:migrate
npm run db:seed
npm start            # ou : npm run dev (watch)
```

- Application : [http://127.0.0.1:3102](http://127.0.0.1:3102)
- Login : [http://127.0.0.1:3102/login.html](http://127.0.0.1:3102/login.html)
- Smoke test : `abeille@ruches.org` / `abeille`

Point d’entrée unique : **`Server.js`** — monte l’API et sert le frontend.

### Configuration

| Fichier | Git | Rôle |
|---------|-----|------|
| `settings.json` | oui | Config publique (serveur, routes, CORS, BDD… — port dev **3102**) |
| `settings.private.json` | **non** | Secrets (`api.jwtSecret`) |
| `settings.private.example.json` | oui | Modèle à copier |

Chargement : `settings.js` fusionne public + privé.

### Production (nginx + PM2)

Exemple : https://ams.dynatech.app — nginx reverse-proxy vers Node en local (`127.0.0.1` + port défini dans `settings.json`).

1. Adapter `settings.json` pour la prod (`"host": "127.0.0.1"`, `"env": "production"`, port local derrière le proxy).
2. Renseigner un **`jwtSecret` fort** dans `settings.private.json` (non versionné).
3. Installer, migrer, démarrer :

```bash
npm install --omit=dev
npm run db:migrate
# optionnel : npm run db:seed  (uniquement si BDD vide / demo)
pm2 start ecosystem.config.cjs
# ou : ./update.sh --remote origin --branch main
```

Le navigateur doit appeler `/api/...` sur le même host HTTPS (pas une URL localhost absolue).

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
| **Reine** | Seule à pouvoir ajouter, modifier et supprimer des **outils** ; peut aussi gérer toutes les **entrées** |

Tout utilisateur authentifié peut **ajouter** une entrée.  
Modifier / supprimer une entrée : **Reine** ou **créateur** de l’entrée.

### Outils

Chaque outil a une désignation, une description, une icône et un code. Affichés sur l’accueil ; page détail (`outil.html?code=…`) avec une liste d’**entrées** (désignation + lien), filtrable.

## Structure du dépôt

```
ams/
├── Server.js            # Serveur HTTP : frontend + montage /api
├── settings.json        # Config publique (port 3102 en dev)
├── settings.private.example.json
├── settings.js          # Chargement / fusion des settings
├── ecosystem.config.cjs # Config PM2
├── update.sh            # Déploiement : git + npm + migrate + pm2
├── package.json
├── app/                 # Frontend statique
│   ├── index.html       # Accueil (cartes outils)
│   ├── login.html
│   ├── parametres.html  # Config des outils
│   ├── profil.html
│   ├── outil.html       # Liste des entrées d’un outil
│   ├── auth.js          # Session + appels API (/api)
│   ├── style.css
│   └── icons/
├── api/                 # API uniquement (routes, services, BDD)
│   ├── src/
│   │   ├── app.js       # createApiRouter() → monté sur /api
│   │   ├── config.js
│   │   ├── db/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── constants/
│   ├── data/            # ams.db (gitignored)
│   └── README.md
├── uploads/             # Pièces jointes (gitignored sauf .gitkeep)
├── AGENTS.md
└── README.md
```

## Pages frontend

| Page | Rôle |
|------|------|
| `index.html` | Accueil, menu, cartes outils dynamiques |
| `login.html` | Connexion |
| `parametres.html` | CRUD outils (Reine) |
| `outil.html` | Entrées d’un outil + recherche + bouton **+** |
| `entree.html` | Ajouter / modifier / supprimer une entrée |
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
| POST | `/api/outils/:code/entrees` | oui | Ajouter une entrée |
| PATCH / DELETE | `/api/outils/:code/entrees/:id` | oui (**Reine** ou **créateur**) | Modifier / supprimer |
| GET | `/api/adherents` | oui | Adhérents |
| GET | `/api/evenements` | oui | Événements |

## Scripts

```bash
npm start        # Server.js (frontend + API)
npm run dev      # Idem en watch
npm run db:migrate
npm run db:seed
```

## Licence

UNLICENSED — usage interne.
