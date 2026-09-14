# Schéma de base de données

PostgreSQL avec colonnes JSONB pour les données flexibles (propriétés IFC,
statistiques, métadonnées). Toutes les tables métier portent `tenant_id`
pour l'isolation multi-locataire ; le filtrage se fait manuellement dans
chaque endpoint (`Depends(get_tenant_id)`), il n'y a pas d'auto-scoping ORM.

Source de vérité : `backend/app/models/database.py` (SQLAlchemy) +
`backend/alembic/versions/` (migrations). Ce document est une vue lisible
du schéma, pas un script à exécuter directement.

## Hiérarchie métier

```
Tenant (cabinet)
 ├─ User (comptes du cabinet)
 ├─ Client (maître d'ouvrage)
 │   └─ Project
 │       └─ Model (fichier IFCXML importé et parsé)
 │           └─ Element (mur, porte, dalle, …)
 │               ├─ Relationship (vers d'autres elements)
 │               ├─ Space / Storey (vues dédiées de certains elements)
 │               └─ PriceCatalogItem (prix assigné, optionnel)
 └─ PriceCatalogItem (catalogue de prix unitaires du cabinet)
```

`Job` (le suivi d'un upload) précède `Model` dans le pipeline : un upload
crée un `Job`, le worker en arrière-plan le parse et crée le `Model`
correspondant.

## Tables

### `tenants`
Le cabinet (BE/métreur). Racine de l'isolation multi-locataire.

| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | varchar(255) | |
| slug | varchar(100) UNIQUE | |
| is_active | boolean | |
| max_file_size | bigint | octets, défaut 500 Mo |
| max_files_per_month | bigint | défaut 100 |
| max_storage_size | bigint | octets, défaut 10 Go |
| logo_data | bytea | image de marque des rapports (Excel/PDF/DPGF) |
| logo_content_type | varchar(100) | |
| created_at / updated_at | timestamptz | |

### `users`
Comptes du cabinet.

| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → tenants, CASCADE | |
| email | varchar(255) UNIQUE | |
| hashed_password | varchar(255) | bcrypt |
| full_name | varchar(255) | |
| is_active / is_superuser | boolean | |
| last_login | timestamptz | |
| reset_token | varchar(255) UNIQUE | jeton de réinitialisation à usage unique |
| reset_token_expires_at | timestamptz | |
| created_at / updated_at | timestamptz | |

### `audit_logs`
Journal d'audit (append-only, pas de suppression douce).

| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → tenants, CASCADE | |
| user_id | UUID FK → users, SET NULL | |
| action | varchar(100) | CREATE, READ, UPDATE, DELETE, UPLOAD, … |
| resource_type | varchar(100) | job, model, element, … |
| resource_id | UUID | |
| ip_address | varchar(45) | |
| user_agent | text | |
| details | jsonb | |
| created_at | timestamptz | |

### `clients`
Maîtres d'ouvrage d'un cabinet.

| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → tenants, CASCADE | |
| name | varchar(255) | requis |
| contact_name, email, phone | varchar | optionnels |
| address, notes | text | optionnels |
| status | varchar(20) | `active` \| `deleted` — voir *Suppression douce* |
| created_at / updated_at | timestamptz | |

### `projects`
Projets d'un client.

| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → tenants, CASCADE | |
| client_id | UUID FK → clients, CASCADE, NOT NULL | |
| name | varchar(255) | requis |
| description | text | |
| status | varchar(20) | `active` \| `deleted` |
| created_at / updated_at | timestamptz | |

### `jobs`
Suivi d'un upload et de son traitement (validation → parsing).

| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → tenants, CASCADE | |
| project_id | UUID FK → projects, SET NULL | nullable — requis à l'upload par l'API, mais la colonne reste nullable pour ne pas casser une ligne si le projet est ensuite retiré |
| filename, file_size, file_path | | |
| ifc_version | varchar(10) | `IFC2X3` ou `IFC4` |
| status | varchar(20) | `EN_ATTENTE, VALIDATION, VALIDE, PARSING, TRANSFORMATION, TERMINE, ECHOUE` |
| error_message | text | |
| validation_errors | jsonb | |
| job_metadata | jsonb | |
| created_at, updated_at, started_at, completed_at | timestamptz | |

### `models`
Un modèle IFC parsé (le résultat d'un `Job` réussi).

| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| job_id | UUID FK → jobs, CASCADE | |
| tenant_id | UUID FK → tenants, CASCADE | |
| project_id | UUID FK → projects, SET NULL | nullable — un modèle importé avant la mise en place des projets, ou dont le projet a été retiré, reste visible comme « Sans projet » |
| name, description | | nom = `IfcProject.Name` ou nom de fichier |
| project_guid | UUID | GUID de l'`IfcProject` racine (à ne pas confondre avec `project_id`, la relation métier) |
| statistics | jsonb | compteurs (éléments, espaces, étages) + résumés qualité/conformité, voir plus bas |
| status | varchar(20) | `active` \| `deleted` |
| created_at / updated_at | timestamptz | |

`statistics` contient entre autres : `elements`, `spaces`, `storeys`,
`ifc_version`, `quality_summary`/`quality_warnings` (voir
`quality_service.py`) et `compliance_summary`/`compliance_warnings` (voir
`compliance_service.py`), calculés une fois par le worker de traitement.

`client_name`, `project_name` et `client_id` ne sont **pas** des colonnes :
ce sont des propriétés Python calculées sur `Model` en remontant la
relation `project → client` (voir `Model.client_name` etc. dans
`database.py`), exposées telles quelles par l'API.

### `elements`
Éléments IFC (murs, dalles, portes, fenêtres, équipements CVC/plomberie/
électricité, …).

| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| model_id | UUID FK → models, CASCADE | |
| tenant_id | UUID FK → tenants, CASCADE | |
| guid | UUID | GUID IFC ; UNIQUE avec `model_id` |
| ifc_type | varchar(100) | `IfcWall`, `IfcDoor`, … (130 types IfcElement + `IfcSpace`) |
| name, description, tag | | |
| project_id, site_id, building_id, storey_id, space_id | UUID FK → elements | hiérarchie spatiale IFC (auto-référence) — sans rapport avec la table `projects` métier |
| properties | jsonb | Psets résolus |
| quantities | jsonb | Qtos résolus |
| geometry | jsonb | placement (X/Y/Z/rotation), pas de B-rep |
| attributes | jsonb | matériau, etc. |
| price_catalog_item_id | UUID FK → price_catalog_items, SET NULL | assignation manuelle de prix pour le métré chiffré |
| quantity_override_value | numeric(14,3) | correction manuelle de quantité |
| quantity_override_unit | varchar(20) | n'est appliquée que si elle correspond à l'unité du prix effectif, sinon ignorée (jamais de calcul silencieusement faux) |
| created_at / updated_at | | |

### `relationships`
Relations entre éléments (CONTAINS, AGGREGATES, VOIDS, FILLS, …).

| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| model_id | UUID FK → models, CASCADE | |
| tenant_id | UUID FK → tenants, CASCADE | |
| relationship_type | varchar(50) | |
| from_element_id, to_element_id | UUID FK → elements, CASCADE | |
| relationship_metadata | jsonb | |
| created_at | | |

### `spaces` / `storeys`
Vues dédiées de certains `elements` (espaces et étages), pour un accès
direct sans filtrer `elements` par type. Mêmes hiérarchies (`storey_id`,
`building_id`), contrainte unique `(model_id, guid)`.

### `price_catalog_items`
Catalogue de prix unitaires d'un cabinet (avant-métré chiffré).

| Colonne | Type | Notes |
|---|---|---|
| id | UUID PK | |
| tenant_id | UUID FK → tenants, CASCADE | |
| ifc_type | varchar(100) | |
| label | varchar(255) | ex. « Mur brique 20cm » |
| unit | varchar(20) | `m²`, `m³`, `ml`, `u` |
| unit_price | numeric(12,2) | en MAD |
| notes | text | |
| created_at / updated_at | | |

Plusieurs entrées peuvent partager le même `ifc_type` (ex. deux `IfcWall`
d'épaisseurs différentes) — la résolution du prix effectif d'un élément
(assignation explicite, sinon prix unique si non ambigu, sinon laissé de
côté) vit dans `backend/app/services/costing_service.py`.

## Suppression douce (`status`)

`clients`, `projects` et `models` portent une colonne `status`
(`active` par défaut, `deleted` après suppression). **Aucune suppression
n'exécute de `DELETE` SQL** sur ces trois tables : elle bascule `status` en
cascade —

- Supprimer un **client** marque ses projets actifs, puis les modèles
  actifs de ces projets, `deleted`.
- Supprimer un **projet** marque ses modèles actifs `deleted`.
- Supprimer un **modèle** ne marque que lui-même (pas d'enfants).

Chaque endpoint `GET`/liste filtre `status = 'active'` par défaut (ou
`?status=deleted` pour la page **Archives**). La restauration
(`POST /{id}/restore`) inverse la cascade vers le bas (restaurer un client
restaure ses projets et modèles archivés avec lui) et remonte les
ancêtres nécessaires (restaurer un modèle dont le projet est archivé
restaure aussi ce projet, et son client si besoin) — sans jamais toucher
aux frères/sœurs non concernés. Voir `clients.py`, `projects.py`,
`models.py`.

`jobs` n'a pas de suppression douce : ce sont des enregistrements de
traitement, pas des ressources qu'on archive.

## Contraintes de suppression (FK `ondelete`)

| Relation | Comportement DB |
|---|---|
| `*.tenant_id → tenants` | CASCADE (pas de flux applicatif ne supprime un tenant) |
| `projects.client_id → clients` | CASCADE |
| `jobs.project_id`, `models.project_id → projects` | SET NULL |
| `elements.model_id → models`, `relationships.*_element_id → elements` | CASCADE |
| `elements.price_catalog_item_id → price_catalog_items` | SET NULL |

Ces règles sont un filet de sécurité au niveau base ; en pratique, la
suppression applicative de `clients`/`projects`/`models` passe toujours
par la suppression douce ci-dessus, pas par un `DELETE` réel.

## Index

- Toutes les FK indexées, `tenant_id` indexé sur chaque table pour les
  requêtes multi-locataires.
- `status` indexé sur `clients`, `projects`, `models` (filtre actif/archivé
  sur toutes les listes).
- GIN sur `elements.properties` / `elements.quantities` pour les
  recherches sur les Psets/Qtos.
- Contraintes uniques `(model_id, guid)` sur `elements`, `spaces`,
  `storeys`.

## Migrations

Alembic, une révision par changement de schéma, chaînées linéairement
(`backend/alembic/versions/`). Appliquées automatiquement au démarrage du
conteneur backend (`alembic upgrade head`, voir `docker-compose.yml`) ;
manuellement via `alembic upgrade head` en local. Voir
[DEPLOYMENT.md](./DEPLOYMENT.md).

## Row-Level Security

`backend/migrations/001_enable_rls.sql` active RLS sur les tables à portée
locataire ; appliqué automatiquement (et silencieusement ignoré s'il l'est
déjà) au démarrage du conteneur backend. En pratique, l'isolation
locataire réelle vient du filtrage explicite `tenant_id` dans chaque
requête ORM (`Depends(get_tenant_id)`), RLS est une protection complémentaire
au niveau base.
