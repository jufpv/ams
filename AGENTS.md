# AGENTS.md — Guide pour les agents IA

Contexte et conventions pour travailler sur le dépôt **AMS** (espace mouvement citoyen / ruches).

## Vue d’ensemble

Monorepo léger :

- `app/` — frontend HTML/CSS/JS (pas de bundler, modules ES natifs)
- `api/` — Express + SQLite, sert aussi `app/` en statique sur le port **3001**

Toujours privilégier la cohérence avec le code existant plutôt qu’introduire un nouveau framework ou une nouvelle stack.

## Lancer l’app en local

```bash
npm install
cp settings.private.example.json settings.private.json
npm run db:migrate && npm run db:seed
npm start
# ou watch : npm run dev
```

- **`Server.js`** : serveur HTTP (static `app/` + montage API)
- **`settings.json` / `settings.private.json`** : configuration (plus de fichiers `.env`)
- **`api/`** : API uniquement (routes, services, middleware, SQLite)

Prod : `pm2 start ecosystem.config.cjs`.

URL : `http://127.0.0.1:3001`

Comptes seed :

- Maçonne : `abeille@ruches.org` / `abeille`
- Reine : `reine@ruches.org` / `reine`

## Domaine métier (vocabulaire)

| Terme | Signification |
|-------|----------------|
| **Ruche** | Espace de travail local (`ruches`) |
| **Abeille** | Utilisateur (`users`) avec un rôle |
| **Outil** | Carte configurable sur l’accueil (`outils`) |
| **Entrée** | Ligne liée à un outil (`entrees` : designation + lien) |
| **Adhérent** | Contact de la ruche (`adherents`) |

Rôles exacts (casse et accents) : `Butineuse`, `Maçonne`, `Reine`.  
Constante source de vérité : `api/src/constants/roles.js`.

## Permissions

- **Seul le rôle Reine** peut créer / modifier / supprimer des outils (API + UI).
- Middleware : `requireReine` / `canManageOutils` côté API.
- UI paramètres (`app/parametres.js`) : champs en `readonly`, boutons **Ajouter** / **Supprimer** / **Enregistrer** **visibles mais `disabled` et grisés** si non-Reine (ne pas les cacher).
- **Entrées** : tout utilisateur authentifié peut en créer ; modifier / supprimer = `canManageEntree` (Reine ou `created_by`).
- Ne pas élargir les droits sans demande explicite.

## Conventions frontend (`app/`)

- Pages HTML séparées + un JS module par page (`app.js`, `login.js`, `parametres.js`, `outil.js`, `profil.js`).
- Auth / fetch centralisés dans `auth.js` (`api()`, session `localStorage`).
- Styles dans `style.css` (police Manrope, identité abeille / `abeille.png`).
- Icônes outils : chemins relatifs type `icons/*.svg`.
- UI en **français**.
- Pas de React / Vue / bundler sauf demande explicite.
- Boutons non autorisés : visibles + grisés, pas `hidden`.

## Conventions backend (`api/`)

- ESM (`"type": "module"`).
- Export : `createApiRouter()` dans `src/app.js` — monté par `Server.js` sur `/api`.
- Pas d’écoute HTTP ni de fichiers statiques dans `api/`.
- Routes dans `src/routes/`, logique métier dans `src/services/`, schéma dans `src/db/schema.sql`.
- Après changement de schéma : adapter `migrate.js` / `seed.js` si besoin.
- Réponses JSON ; erreurs via `errorHandler`.
- Données toujours scopées à la **ruche** de l’utilisateur connecté.
- Ne pas committer `api/data/*.db` ni `settings.private.json`.
- Pas de fichiers `.env` : toute la config passe par `settings*.json`.

## Fichiers sensibles à ne pas casser

- `api/src/constants/roles.js` — rôles et `canManageOutils`
- `api/src/middleware/auth.js` — JWT
- `app/auth.js` — session côté client
- Seed : codes ruche `10-58-89`, comptes de démo

## Style de contribution

- Diffs ciblés : pas de refactor large non demandé.
- Pas de nouveaux fichiers markdown sauf demande.
- Pas de commit / push sauf demande explicite.
- Préférer étendre les patterns existants (services, routes, pages) plutôt que d’en inventer de nouveaux.

## Checklist rapide avant de livrer une feature

1. Auth JWT respectée sur les routes protégées.
2. Filtrage par `ruche_id` de l’utilisateur.
3. Droits Reine vérifiés côté API **et** UX (boutons grisés).
4. Seed / migrate toujours utilisables après un changement de schéma.
5. Smoke test manuel : login Maçonne vs Reine sur la page concernée.
