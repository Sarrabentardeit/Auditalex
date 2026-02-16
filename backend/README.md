# Audit Backend API

Backend API pour l'application d'audit d'hygiène.

## Structure du projet

```
backend/
├── src/
│   ├── config/          # Configuration (database, etc.)
│   ├── controllers/     # Contrôleurs (logique métier)
│   ├── middleware/      # Middleware (auth, validation, etc.)
│   ├── routes/          # Routes API
│   ├── services/        # Services (optionnel, pour logique complexe)
│   ├── utils/           # Utilitaires (logger, jwt, password)
│   ├── validators/      # Validateurs Zod
│   └── index.ts         # Point d'entrée
├── .env.example         # Exemple de fichier d'environnement
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

1. Installer les dépendances :
```bash
npm install
```

2. Configurer la base de données PostgreSQL et créer le fichier `.env` :
```bash
cp .env.example .env
```

3. Modifier les variables d'environnement dans `.env`

4. Créer la base de données et exécuter le schéma :
```bash
psql -U postgres -d audit_db -f src/config/database.sql
```

## Développement

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

## Production

```bash
npm run build
npm start
```

## API Endpoints

### Authentification

- `POST /api/auth/login` - Connexion
- `POST /api/auth/register` - Inscription (optionnel)

### Utilisateurs (Admin uniquement)

- `GET /api/users` - Liste des utilisateurs
- `GET /api/users/:id` - Détails d'un utilisateur
- `POST /api/users` - Créer un utilisateur
- `PUT /api/users/:id` - Modifier un utilisateur
- `DELETE /api/users/:id` - Supprimer un utilisateur
- `PATCH /api/users/:id/toggle-active` - Activer/désactiver un utilisateur

### Audits

- `GET /api/audits` - Liste des audits (filtrés par rôle)
- `GET /api/audits/:id` - Détails d'un audit
- `POST /api/audits` - Créer un audit
- `PUT /api/audits/:id` - Modifier un audit
- `DELETE /api/audits/:id` - Supprimer un audit

## Sécurité

- Authentification JWT
- Hash des mots de passe avec bcrypt
- Rate limiting
- Helmet pour la sécurité HTTP
- Validation des données avec Zod
- CORS configuré

## Base de données

PostgreSQL avec les tables :
- `users` - Utilisateurs (admin/auditeur)
- `audits` - Audits d'hygiène



