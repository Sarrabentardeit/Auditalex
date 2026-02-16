# Audit d'Hygiène - Application Web

Application web pour la conduite d'audits d'hygiène avec génération de rapports PDF.

## Structure du projet

```
Audit/
├── frontend/          # Application React + TypeScript
│   ├── src/          # Code source
│   ├── public/       # Fichiers statiques
│   └── dist/         # Build de production
└── vercel.json       # Configuration Vercel
```

## Technologies

- **React 19** + **TypeScript**
- **Vite** (build tool)
- **Material-UI** (interface)
- **jsPDF** (génération PDF)
- **Dexie** (IndexedDB)
- **Zustand** (state management)

## Déploiement

Le projet est configuré pour être déployé sur Vercel avec le répertoire `frontend/` comme root.



