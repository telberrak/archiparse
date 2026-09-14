# Frontend — référence

Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, TanStack
React Query. Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour la vue
d'ensemble et [DEPLOYMENT.md](./DEPLOYMENT.md) pour lancer le service.

## Structure

```
frontend/
├── app/                                  # App Router — une route par page
│   ├── layout.tsx                        # layout racine (Providers, TenantInitializer, AppShell)
│   ├── providers.tsx                     # QueryClientProvider
│   ├── page.tsx                          # tableau de bord
│   ├── login/, signup/, forgot-password/, reset-password/
│   ├── clients/page.tsx, clients/[id]/page.tsx
│   ├── projects/page.tsx, projects/[id]/page.tsx
│   ├── upload/page.tsx                   # sélection projet + dépôt de fichier
│   ├── jobs/page.tsx, jobs/[id]/page.tsx
│   ├── models/page.tsx, models/[id]/page.tsx    # liste, explorateur plein écran
│   │   ├── models/[id]/checks/page.tsx          # qualité & conformité
│   │   └── models/[id]/cost-estimate/page.tsx   # métré chiffré, export DPGF
│   ├── pricing/page.tsx, pricing/import/page.tsx
│   ├── archives/page.tsx                 # clients/projets/modèles supprimés + restauration
│   └── settings/page.tsx
│
├── components/
│   ├── ui/                # primitives (button, input, select, progress)
│   ├── layout/             # AppShell (chrome + garde d'auth), Sidebar
│   ├── upload/FileUpload.tsx
│   ├── jobs/JobList.tsx, JobStatus.tsx
│   ├── explorer/           # IfcExplorer, HierarchyTree, explorer.css, explorerUtils.ts
│   ├── models/ModelCard.tsx
│   ├── projects/ProjectCard.tsx
│   ├── settings/           # TenantInfoCard, TenantLogoCard, QuotaUsageCard
│   ├── TenantInitializer.tsx  # garde d'auth (redirige vers /login si pas de session)
│   └── ErrorBoundary.tsx
│
├── lib/
│   ├── api.ts               # client Axios unique, intercepteur JWT + redirection sur 401
│   └── hooks/                # un fichier par domaine, TanStack React Query
│       ├── useAuthReady.ts
│       ├── useClients.ts, useProjects.ts, useModels.ts
│       ├── useJobs.ts, useElements.ts, useModelChecks.ts
│       ├── useCostEstimate.ts, usePriceCatalog.ts
│       └── useTenant.ts
│
├── app/globals.css          # thème (variables CSS), voir plus bas
├── next.config.js, tailwind.config.js, tsconfig.json
└── Dockerfile
```

## Pages principales

| Route | Rôle |
|---|---|
| `/` | tableau de bord (compteurs, modèles récents, accès rapide) |
| `/clients`, `/clients/{id}` | liste (table + création) et détail (édition, projets du client) |
| `/projects`, `/projects/{id}` | idem, tous clients confondus / détail (modèles du projet) |
| `/upload` | sélection d'un projet (requis) puis dépôt de fichier IFCXML |
| `/jobs`, `/jobs/{id}` | suivi des traitements |
| `/models`, `/models/{id}` | liste (avec suppression), explorateur plein écran (voir [EXPLORER.md](./EXPLORER.md)) |
| `/models/{id}/checks` | avertissements qualité + conformité indicative |
| `/models/{id}/cost-estimate` | avant-métré chiffré par lot, export DPGF |
| `/pricing`, `/pricing/import` | catalogue de prix unitaires, import Excel en masse |
| `/archives` | clients/projets/modèles archivés (suppression douce), restauration en un clic |
| `/settings` | infos du cabinet, logo (image de marque), quotas, sécurité |

## Données et état

- **`lib/api.ts`** — instance Axios unique. Intercepteur ajoute
  `Authorization: Bearer <token>` et redirige vers `/login` sur une
  réponse 401 (sauf pour les appels d'auth eux-mêmes).
- **`lib/hooks/`** — `useQuery` pour les lectures (`queryKey` incluant
  les paramètres de filtre, ex. `['models', page, pageSize, projectId,
  statusFilter]`), `useMutation` + `invalidateQueries` pour les
  écritures. Pas de state manager global séparé (Redux, Zustand, …) : React
  Query fait office de cache serveur.
- **`useAuthReady`** — expose si le token/tenant sont disponibles en
  `localStorage`, pour gater les requêtes tant que l'auth n'est pas
  résolue.

## Thème

`app/globals.css` définit des variables CSS (`--primary`, `--accent`,
`--border`, …) consommées via Tailwind (`tailwind.config.js` les mappe en
classes `bg-primary`, `text-accent-foreground`, etc.). Couleur d'accent :
bleu (`hsl(217 91% 60%)`), bordures bleu clair. L'explorateur IFC a sa
propre feuille de style (`components/explorer/explorer.css`) avec les
mêmes teintes mais des variables CSS distinctes — les deux doivent être
mises à jour ensemble si la palette change (voir
[ARCHITECTURE.md § Thème](./ARCHITECTURE.md#thème-et-image-de-marque)).

## Conventions

- Un mutation hook envoie `invalidateQueries` sur toutes les `queryKey`
  que sa réponse peut affecter — par exemple supprimer un projet
  invalidate `projects`, `clients` (compteur) et `models` (les modèles du
  projet disparaissent des listes actives).
- Les listes suivant une hiérarchie (modèles d'un projet, projets d'un
  client) passent l'id parent en paramètre de hook plutôt que de filtrer
  côté client.
- Aucun composant de table/modal générique : les tables sont du HTML brut
  stylé Tailwind (voir `JobList.tsx`, `clients/page.tsx`) ; il n'y a pas
  de bibliothèque de modales, les formulaires de création sont inline.
