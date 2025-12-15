# Frontend - Application Next.js

## Structure

```
frontend/
├── app/
│   ├── layout.tsx                  # Layout racine
│   ├── page.tsx                    # Page d'accueil/landing
│   ├── upload/
│   │   └── page.tsx                # Page d'upload de fichiers
│   ├── jobs/
│   │   ├── page.tsx                # Page de liste des tâches
│   │   └── [id]/
│   │       └── page.tsx            # Page de détail de tâche
│   ├── models/
│   │   ├── page.tsx                # Page de liste des modèles
│   │   └── [id]/
│   │       ├── page.tsx            # Page d'explorateur de modèle
│   │       └── elements/
│   │           └── [guid]/
│   │               └── page.tsx    # Page de détail d'élément
│   └── api/                        # Routes API Next.js (si nécessaire)
│
├── components/
│   ├── ui/                         # Composants UI réutilisables
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── upload/
│   │   ├── FileUpload.tsx          # Upload glisser-déposer
│   │   └── UploadProgress.tsx      # Indicateur de progression d'upload
│   ├── jobs/
│   │   ├── JobList.tsx             # Table/liste des tâches
│   │   └── JobStatus.tsx           # Badge de statut de tâche
│   ├── explorer/
│   │   ├── ModelTree.tsx           # Vue arborescente hiérarchique
│   │   ├── ElementList.tsx         # Liste d'éléments avec filtres
│   │   └── ElementDetail.tsx      # Vue de détail d'élément
│   └── search/
│       └── SearchBar.tsx           # Composant de recherche globale
│
├── lib/
│   ├── api.ts                      # Client API (wrapper fetch)
│   ├── hooks/
│   │   ├── useJobs.ts              # Hook de données des tâches
│   │   ├── useModels.ts           # Hook de données des modèles
│   │   └── useElements.ts          # Hook de données des éléments
│   └── utils.ts                    # Fonctions utilitaires
│
├── public/
│   └── ...                         # Assets statiques
│
├── package.json
├── next.config.js
├── tsconfig.json
└── tailwind.config.js (si utilisation de Tailwind)
```

## Composants Clés

### App Router (`app/`)
Structure Next.js 14+ App Router. Chaque route est un composant de page.

### Composants (`components/`)
- **ui/**: Primitives UI réutilisables (boutons, inputs, tables)
- **upload/**: Interface d'upload de fichiers
- **jobs/**: Statut et liste des tâches
- **explorer/**: Hiérarchie de modèles et navigation d'éléments
- **search/**: Fonctionnalité de recherche

### Bibliothèque (`lib/`)
- **api.ts**: Client API centralisé avec gestion d'erreurs
- **hooks/**: Hooks React Query ou SWR pour récupération de données
- **utils.ts**: Fonctions d'aide

## Dépendances (à ajouter en Phase 5)

- next
- react
- react-dom
- typescript
- @tanstack/react-query (ou swr)
- tailwindcss (optionnel, pour le style)
- shadcn/ui (optionnel, bibliothèque de composants)
