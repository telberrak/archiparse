# Architecture

Archiparse est une plateforme SaaS multi-locataire qui parse des fichiers
IFCXML et donne aux bureaux d'études / métreurs marocains un flux complet :
importer un modèle, l'explorer, le chiffrer (avant-métré), vérifier sa
conformité indicative, et produire des livrables (Excel, PDF, DPGF) sous
leur propre marque — organisé par client puis par projet.

## Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────────┐
│                     Frontend — Next.js (App Router)                │
│  Auth · Clients/Projets/Modèles · Import · Catalogue de prix ·     │
│  Métré chiffré · Explorateur IFC · Archives · Paramètres            │
└──────────────────────────────────────────────────────────────────┘
                                │ HTTP/REST (JWT)
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Backend — FastAPI (app/api/v1/*)                │
│  auth · clients · projects · upload · jobs · models · elements ·   │
│  price_catalog · quota · tenants                                    │
├──────────────────────────────────────────────────────────────────┤
│  Services : validation, parsing (streaming), costing, quality,      │
│  compliance, report (Excel/PDF/DPGF), email, quota, audit           │
├──────────────────────────────────────────────────────────────────┤
│  Worker en arrière-plan (FastAPI BackgroundTasks, in-process)       │
│  validation → parsing → contrôles qualité/conformité                │
└──────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            ┌──────────────┐        ┌──────────────┐
            │  PostgreSQL  │        │   Stockage   │
            │  (JSONB)     │        │   fichiers   │
            └──────────────┘        │  (local dev) │
                                     └──────────────┘
```

Il n'y a pas de file de tâches distribuée (Celery/RQ) : le traitement d'un
upload se fait via `BackgroundTasks` de FastAPI, dans le même processus
que l'API. Redis est présent dans `docker-compose.yml` mais n'est
actuellement consommé par aucun code applicatif — c'est un réservé, pas un
composant actif.

## Principes fondamentaux

1. **Streaming en priorité** — tout parsing XML utilise `lxml.iterparse` ;
   jamais de chargement DOM complet, pour supporter des fichiers volumineux
   avec une mémoire bornée.
2. **Résolution en Python, en une seconde passe** — les Psets/Qtos
   (`IfcRelDefinesByProperties`, `IfcElementQuantity`) sont résolus par
   `parser_service.py`/`ifc_utils.py` directement dans les colonnes JSONB
   `properties`/`quantities` des éléments. Il n'y a pas de couche de
   transformation XSLT séparée (elle a existé, elle a été retirée — voir
   [HISTORY.md](./HISTORY.md)).
3. **Isolation multi-locataire par filtrage explicite** — chaque requête
   ORM filtre manuellement sur `tenant_id` via la dépendance
   `Depends(get_tenant_id)` (JWT ou en-tête `X-Tenant-ID`) ; pas
   d'auto-scoping. RLS PostgreSQL en filet de sécurité complémentaire.
4. **Suppression douce partout où ça compte** — `Client`, `Project`,
   `Model` ne sont jamais réellement supprimés ; voir
   [DATABASE_SCHEMA.md § Suppression douce](./DATABASE_SCHEMA.md#suppression-douce-status).
5. **Permissif mais honnête** — les contrôles qualité/conformité et la
   résolution des prix ne masquent jamais une donnée manquante ou
   ambiguë : ils la signalent (`unmatched_types`, `quality_warnings`,
   « à vérifier ») plutôt que de produire un chiffre silencieusement faux.

## Hiérarchie métier : Tenant → Client → Project → Model

Un cabinet (`Tenant`) gère plusieurs `Client`s (maîtres d'ouvrage), chacun
avec plusieurs `Project`s, chacun avec plusieurs `Model`s (fichiers IFCXML
importés). C'est la structure de navigation du frontend (`/clients`,
`/projects`, `/models`) et le pivot de la suppression douce en cascade.
Un modèle sans projet (import antérieur à cette hiérarchie, ou projet
retiré) reste visible, affiché « Sans projet ».

## Backend — composants

### Couche API (`backend/app/api/v1/`)
Un routeur FastAPI par domaine : `auth`, `clients`, `projects`, `upload`,
`jobs`, `models`, `elements`, `price_catalog`, `quota`, `tenants`. Montés
sous `/api/v1` dans `api/v1/__init__.py`. Chaque endpoint déclare
`tenant_id: UUID = Depends(get_tenant_id)` et filtre sa requête en
conséquence.

### Services (`backend/app/services/`)
Logique métier sans état :

| Service | Rôle |
|---|---|
| `upload_service.py` | sauvegarde du fichier, création du `Job` |
| `validation_service.py` | détection de version IFC, validation XSD en streaming |
| `parser_service.py` + `utils/ifc_utils.py` | parsing streaming, extraction hiérarchie/relations, résolution Psets/Qtos/matériaux |
| `quality_service.py` | avertissements « quantités manquantes » (export imparfait, pas un jugement réglementaire) |
| `compliance_service.py` | contrôles réglementaires **indicatifs** marocains (surface min., épaisseur de mur porteur, ratio de vitrage) — règles explicites, conservatrices ; jamais présentés comme une certification |
| `costing_service.py` | avant-métré chiffré : résolution prix effectif/quantité par élément, regroupement par lot (voir plus bas) |
| `report_service.py` | export Excel (nomenclatures), PDF (rapport modèle), DPGF (Excel groupé par lot avec sous-totaux) — image de marque du tenant intégrée |
| `email_service.py` | e-mail de réinitialisation de mot de passe (SMTP), échoue silencieusement (log, pas d'exception) si mal configuré |
| `quota_service.py` | vérification des quotas (taille fichier, stockage, fichiers/mois) avant upload |
| `audit_service.py` | journal d'audit append-only |

### Worker (`backend/app/workers/processing_worker.py`)
Pipeline déclenché par `BackgroundTasks` après l'upload : validation →
parsing → `quality_service.check_model()` → `compliance_service.check_model()`
→ statistiques stockées dans `Model.statistics` (JSONB).

### Modèles (`backend/app/models/`)
- `database.py` — ORM SQLAlchemy, voir [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md).
- `schemas.py` — modèles Pydantic requête/réponse.

## Avant-métré chiffré et lots

`costing_service.py` associe chaque élément à un prix effectif
(assignation manuelle sur l'élément, sinon prix unique du catalogue si non
ambigu pour son type IFC, sinon laissé de côté dans `unmatched_types`) et
une quantité (résolue depuis les Qtos parsés, ou une correction manuelle
si son unité correspond à celle du prix). Les lignes chiffrées sont
ensuite regroupées en **lots** — `LOT_DEFINITIONS` dans
`costing_service.py` classe les 131 types IFC importables en 8 lots
numérotés (Gros œuvre, Second œuvre, CVC, Plomberie & sanitaire,
Électricité & courants faibles, Réseaux techniques divers, Aménagements &
mobilier, Divers) plus un lot Espaces, chacun avec un sous-total. C'est la
structure attendue d'un DQE/DPGF réel, pas une liste plate : le même
regroupement alimente la page **Métré chiffré** et l'export DPGF.

## Frontend — composants

### App Router (`frontend/app/`)
Une route par page ; voir [FRONTEND.md](./FRONTEND.md) pour l'arborescence
complète (auth, clients/projets/modèles, upload, catalogue de prix,
explorateur, archives, paramètres).

### Explorateur de modèle
Page plein écran `/models/{id}` (pas de nav globale), calquée sur une
maquette dédiée : arbre `Project → Site → Building → Storey → Space` à
gauche, liste filtrable par type IFC, fiche détail à droite (emplacement,
quantités, Psets, matériau, prix/quantité assignés). Voir
[EXPLORER.md](./EXPLORER.md).

### Données (`frontend/lib/`)
- `api.ts` — client Axios unique, intercepteur JWT + redirection sur 401.
- `hooks/` — un fichier par domaine, TanStack React Query (`useQuery` pour
  les lectures, `useMutation` + `invalidateQueries` pour les écritures).

## Authentification

JWT (access token, expiration 30 min), `python-jose` + `passlib[bcrypt]`.
Flux complets : inscription (`/signup`, crée tenant + utilisateur),
connexion, mot de passe oublié / réinitialisation (jeton à usage unique,
e-mail via `email_service.py`), changement de mot de passe. Le frontend
redirige vers `/login` sur toute réponse 401 (sauf sur les endpoints
d'auth eux-mêmes).

## Thème et image de marque

Frontend : thème clair professionnel (bleu `hsl(217 91% 60%)` comme
couleur d'accent, bordures bleu clair), piloté par variables CSS dans
`frontend/app/globals.css`. Rapports (Excel/PDF/DPGF) : vert de marque
(`#2F6F4F`) et logo du tenant intégrés par `report_service.py` — ce sont
deux palettes indépendantes (écran vs documents exportés).

## Flux de traitement d'un upload

```
1. Utilisateur choisit un projet (requis) + fichier IFCXML → POST /upload
2. Fichier stocké (chemin scopé au tenant), Job créé (statut EN_ATTENTE)
3. BackgroundTask prend la main :
   a. Validation XSD en streaming (IFC2X3 ou IFC4 selon le namespace)
   b. Parsing streaming : entités, hiérarchie, relations
   c. Résolution Psets/Qtos/matériaux (seconde passe Python)
   d. Model créé, rattaché au projet choisi
   e. quality_service + compliance_service → Model.statistics
4. Job passe à TERMINE (ou ECHOUE avec erreurs détaillées)
5. Le modèle apparaît dans /models, /projects/{id}, le tableau de bord
```

## Pile technologique

| Couche | Techno |
|---|---|
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, lxml (streaming), openpyxl + Jinja2 + WeasyPrint (rapports), python-jose + passlib (auth) |
| Base de données | PostgreSQL 14, JSONB, RLS |
| Frontend | Next.js 14 (App Router), React 18, TypeScript, TanStack React Query, Tailwind CSS, Axios |
| Infra | Docker Compose (backend, frontend, postgres, redis — redis inutilisé actuellement) |

## Sécurité

- JWT + isolation multi-locataire par filtrage `tenant_id` explicite, RLS
  en complément.
- Quotas par tenant (taille fichier, stockage, fichiers/mois) vérifiés
  avant chaque upload.
- Journal d'audit (`audit_logs`) sur les actions sensibles.
- Suppression douce : aucune perte de données accidentelle sur
  client/projet/modèle, tout est restaurable depuis **Archives**.

## Limites connues

- Pas de file de tâches distribuée : le traitement d'un upload bloque un
  worker FastAPI le temps du parsing (acceptable à l'échelle actuelle,
  pas conçu pour un très fort volume concurrent).
- Pas de vue 3D : seule la position (placement) est extraite, pas la
  géométrie de représentation (B-rep, extrusions).
- Les contrôles réglementaires sont indicatifs (« à vérifier »), pas une
  certification de conformité.
- Comparaison/versionnage de modèles pas encore implémenté (identifié
  comme évolution future).
