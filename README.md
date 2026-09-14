# Archiparse

Plateforme SaaS multi-locataire pour bureaux d'études et métreurs : upload,
validation et parsing en streaming de fichiers IFCXML, avant-métré
chiffré, contrôles réglementaires indicatifs, et export de livrables
(Excel, PDF, DPGF) sous la marque du cabinet — organisé par client puis
par projet.

## Démarrage rapide

```bash
./run.sh          # démarre tout via Docker Compose (postgres, redis, backend, frontend)
```

Puis ouvrir http://localhost:3000/signup pour créer votre cabinet, ou
utiliser `admin@example.com` / `admin123` si le jeu de données de
développement est déjà initialisé. Détails, variables d'environnement,
déploiement sans Docker et dépannage : [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Fonctionnalités

- Upload IFCXML (glisser-déposer), validation XSD (IFC2X3 et IFC4),
  parsing en streaming avec résolution complète des Psets/Qtos
- Clients → Projets → Modèles, avec suppression douce et restauration
  (page **Archives**)
- Explorateur de modèle plein écran : hiérarchie, recherche, quantités,
  propriétés, matériaux
- Catalogue de prix unitaires par cabinet, import Excel en masse
- Avant-métré chiffré groupé par lot (gros œuvre, second œuvre, CVC,
  plomberie, électricité, …), export DPGF
- Contrôles réglementaires indicatifs marocains (surfaces, murs porteurs,
  vitrage)
- Exports Excel / PDF à l'image du cabinet (logo intégré)
- Authentification JWT complète (inscription, connexion, mot de passe
  oublié), isolation multi-locataire, quotas, journal d'audit

## Pile technique

**Backend** — FastAPI, PostgreSQL (JSONB), SQLAlchemy + Alembic, lxml
(parsing streaming), openpyxl/WeasyPrint (rapports).
**Frontend** — Next.js 14 (App Router), React 18, TypeScript, TanStack
React Query, Tailwind CSS.

## Documentation

| | |
|---|---|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | vue d'ensemble du système, composants, flux de données |
| [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) | schéma complet, suppression douce, index |
| [docs/BACKEND.md](./docs/BACKEND.md) | structure du code backend, tous les endpoints API |
| [docs/FRONTEND.md](./docs/FRONTEND.md) | structure du code frontend, pages, hooks |
| [docs/EXPLORER.md](./docs/EXPLORER.md) | l'explorateur de modèle IFC |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Docker, configuration, dépannage |
| [docs/HISTORY.md](./docs/HISTORY.md) | comment le projet en est arrivé là |

Documentation API interactive une fois le backend démarré :
http://localhost:8000/docs

## Structure du dépôt

```
archiparse/
├── backend/          # FastAPI — voir docs/BACKEND.md
├── frontend/          # Next.js — voir docs/FRONTEND.md
├── docs/               # documentation
├── xsd/                # schémas IFC (IFC2X3.xsd, ifcXML4.xsd) + fichiers d'exemple
├── docker-compose.yml, docker-compose.dev.yml, docker-compose.alt.yml
└── run.sh              # wrapper Docker Compose (voir docs/DEPLOYMENT.md)
```

## Prochaines pistes

Comparaison/versionnage de modèles, rôles/permissions par tenant,
interface bilingue FR/AR, vue 3D — voir
[docs/HISTORY.md § État actuel](./docs/HISTORY.md#état-actuel).
