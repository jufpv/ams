# AMS API

API Express + SQLite pour l'espace mouvement citoyen.

Montée par le serveur hôte (`../Server.js`) sur le préfixe **`/api`**.  
Ce dossier ne gère ni l’écoute HTTP ni le frontend.

## Développement

Préférer le point d’entrée racine :

```bash
# depuis la racine du dépôt
npm install
cp settings.private.example.json settings.private.json
npm run db:migrate
npm run db:seed
npm start
```

Config : `../settings.json` + `../settings.private.json` (voir `../settings.js`).

Application : `http://127.0.0.1:3001`  
Login : `http://127.0.0.1:3001/login.html`

### Compte de test

- Email : `abeille@ruches.org`
- Mot de passe : `abeille`
- Rôle : `Maçonne`
- Ruche : `Ruche 10-58-89`

### Compte reine

- Email : `reine@ruches.org`
- Mot de passe : `reine`
- Rôle : `Reine`
- Ruche : `Ruche 10-58-89`

### Rôles abeilles

| Rôle | Description |
|------|-------------|
| `Butineuse` | Rôle par défaut |
| `Maçonne` | Compte de test |
| `Reine` | Peut ajouter, modifier et supprimer des outils |

Seul le rôle Reine peut gérer la configuration des outils.

## Endpoints

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/health` | non | Santé du serveur et de la BDD |
| POST | `/api/auth/login` | non | Connexion (email + password) |
| GET | `/api/auth/me` | oui | Utilisateur courant |
| PATCH | `/api/auth/me` | oui | Mettre à jour le profil |
| GET | `/api/ruches/me` | oui | Ruche de l'utilisateur connecté |
| GET | `/api/outils` | oui | Outils de la ruche |
| GET | `/api/outils/:code` | oui | Détail d'un outil |
| GET | `/api/outils/:code/entrees` | oui | Entrées d'un outil (`?q=` recherche) |
| POST | `/api/outils` | oui (Reine) | Ajouter un outil |
| PATCH | `/api/outils/:id` | oui (Reine) | Mettre à jour un outil |
| DELETE | `/api/outils/:id` | oui (Reine) | Supprimer un outil |
| GET | `/api/adherents` | oui | Adhérents de la ruche |
| GET | `/api/evenements` | oui | Événements de la ruche |

## Structure

```
api/
├── data/           # Fichier SQLite (gitignored)
├── src/
│   ├── app.js      # createApiRouter()
│   ├── config.js
│   ├── db/
│   ├── routes/
│   ├── services/
│   └── middleware/
└── package.json
```

Export principal : `createApiRouter()` depuis `src/app.js`.
