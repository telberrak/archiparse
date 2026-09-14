# Backend — référence

FastAPI + SQLAlchemy + PostgreSQL. Voir [ARCHITECTURE.md](./ARCHITECTURE.md)
pour la vue d'ensemble et [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) pour
le schéma. [DEPLOYMENT.md](./DEPLOYMENT.md) pour lancer le service.

## Structure

```
backend/
├── app/
│   ├── api/v1/
│   │   ├── __init__.py       # monte tous les routeurs sous /api/v1
│   │   ├── auth.py           # inscription, connexion, mot de passe
│   │   ├── clients.py        # CRUD clients + suppression douce/restauration
│   │   ├── projects.py       # CRUD projets + suppression douce/restauration
│   │   ├── upload.py         # upload de fichier IFCXML
│   │   ├── jobs.py           # suivi des tâches de traitement
│   │   ├── models.py         # modèles parsés, rapports, métré, qualité, conformité
│   │   ├── elements.py       # éléments IFC, assignation prix/quantité
│   │   ├── price_catalog.py  # catalogue de prix unitaires + import Excel
│   │   ├── quota.py          # utilisation des quotas du tenant
│   │   └── tenants.py        # infos tenant + logo (image de marque)
│   │
│   ├── core/
│   │   ├── config.py         # paramètres (env), voir DEPLOYMENT.md
│   │   ├── database.py       # session SQLAlchemy
│   │   ├── security.py       # JWT, hachage de mot de passe
│   │   └── dependencies.py   # get_tenant_id, get_db_session, get_verified_tenant
│   │
│   ├── models/
│   │   ├── database.py       # ORM SQLAlchemy — source de vérité du schéma
│   │   └── schemas.py        # Pydantic requête/réponse
│   │
│   ├── services/              # logique métier, sans état
│   │   ├── upload_service.py
│   │   ├── validation_service.py
│   │   ├── parser_service.py
│   │   ├── quality_service.py
│   │   ├── compliance_service.py
│   │   ├── costing_service.py
│   │   ├── report_service.py
│   │   ├── email_service.py
│   │   ├── quota_service.py
│   │   └── audit_service.py
│   │
│   ├── workers/
│   │   └── processing_worker.py   # pipeline validation → parsing → qualité/conformité
│   │
│   ├── middleware/
│   │   ├── auth_middleware.py
│   │   └── tenant_middleware.py
│   │
│   ├── utils/
│   │   ├── ifc_utils.py       # ELEMENT_TYPES, extraction Psets/Qtos, hiérarchie
│   │   └── xml_utils.py
│   │
│   └── main.py                # point d'entrée FastAPI
│
├── alembic/versions/          # migrations, une révision par changement de schéma
├── scripts/
│   ├── create_tenant.py       # création interactive de tenant + utilisateur
│   ├── create_tenant_auto.py  # équivalent non-interactif (--name/--email/--password)
│   ├── init_db.py
│   └── check_rls.py
├── migrations/001_enable_rls.sql
├── templates/reports/         # gabarits Jinja2 (rapport PDF)
├── xsd/                       # IFC2X3.xsd, ifcXML4.xsd
├── requirements.txt
├── Dockerfile
└── .env.example
```

## Points d'entrée API

Base : `/api/v1`. Documentation interactive : `/docs` (Swagger),
`/redoc`. Toute route hors `auth.register`/`auth.login`/`auth.signup`/
`auth.forgot-password`/`auth.reset-password` exige un JWT (`Authorization:
Bearer <token>`) et résout le tenant depuis son claim.

### Authentification (`auth.py`)
| | |
|---|---|
| `POST /auth/register` | enregistrement (tenant existant) |
| `POST /auth/signup` | crée un tenant **et** son premier utilisateur |
| `POST /auth/login` | retourne un JWT (expiration 30 min) |
| `GET /auth/me` / `PUT /auth/me` | profil utilisateur courant |
| `POST /auth/change-password` | |
| `POST /auth/forgot-password` / `POST /auth/reset-password` | jeton à usage unique par e-mail |

### Clients (`clients.py`) / Projets (`projects.py`)
CRUD standard (`GET`/`POST`/`PUT`/`DELETE`) + `POST /{id}/restore`. `DELETE`
est une suppression douce en cascade (voir
[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md#suppression-douce-status)) ; les
listes acceptent `?status=active|deleted` (défaut `active`). `projects`
accepte aussi `?client_id=`.

### Upload / Traitement (`upload.py`, `jobs.py`)
| | |
|---|---|
| `POST /upload` | fichier IFCXML (multipart) + `project_id` (requis) ; vérifie les quotas, crée un `Job`, déclenche le traitement en arrière-plan |
| `GET /jobs` / `GET /jobs/{id}` | suivi du statut |

### Modèles (`models.py`)
| | |
|---|---|
| `GET /models` | liste (filtrable par `project_id`, `status`) |
| `GET /models/{id}` | détail (inclut client/projet résolus) |
| `DELETE /models/{id}` / `POST /models/{id}/restore` | suppression douce / restauration |
| `GET /models/{id}/storeys` | étages triés par élévation |
| `GET /models/{id}/report?format=xlsx\|pdf\|dpgf` | export (DPGF = groupé par lot avec sous-totaux) |
| `GET /models/{id}/cost-estimate` | avant-métré chiffré, groupé par lot |
| `GET /models/{id}/quality` | avertissements « quantités manquantes » |
| `GET /models/{id}/compliance` | avertissements réglementaires indicatifs |

### Éléments (`elements.py`)
| | |
|---|---|
| `GET /elements?model_id=` | liste (hiérarchie spatiale, Psets, Qtos, prix/quantité assignés) |
| `GET /elements/{id}` | détail |
| `PUT /elements/{id}/price` | assigner/retirer un prix de catalogue |
| `PUT /elements/{id}/quantity-override` | corriger manuellement une quantité |

### Catalogue de prix (`price_catalog.py`)
CRUD + `GET /price-catalog/import-template` (gabarit Excel à télécharger)
et `POST /price-catalog/import` (import en masse depuis ce gabarit,
upsert par `(ifc_type, label)`, erreurs rapportées ligne par ligne sans
bloquer tout l'import).

### Tenant / Quotas (`tenants.py`, `quota.py`)
Infos du cabinet, logo (image de marque des rapports), et
`GET /quota/usage`.

## Services — détail

| Service | Entrée → Sortie |
|---|---|
| `validation_service.py` | fichier IFCXML → version détectée + erreurs XSD |
| `parser_service.py` + `ifc_utils.py` | fichier validé → entités/relations/Psets/Qtos résolus, écrits en JSONB |
| `quality_service.py` | modèle parsé → avertissements « quantités manquantes » |
| `compliance_service.py` | modèle parsé → avertissements réglementaires indicatifs marocains (surfaces min., épaisseur mur porteur, ratio vitrage) |
| `costing_service.py` | modèle + catalogue de prix → lignes chiffrées groupées par lot, types non chiffrés listés séparément |
| `report_service.py` | modèle (+ estimation coûts) → classeur Excel / PDF / DPGF, logo tenant intégré |
| `email_service.py` | jeton de réinitialisation → e-mail SMTP (échoue silencieusement si mal configuré) |
| `quota_service.py` | tenant + taille fichier → autorisé / refusé |
| `audit_service.py` | action → ligne dans `audit_logs` |

## Conventions

- **Isolation tenant** : chaque endpoint prend
  `tenant_id: UUID = Depends(get_tenant_id)` et filtre sa requête
  manuellement. Pas d'auto-scoping ORM.
- **Suppression douce** sur `Client`/`Project`/`Model` uniquement (voir
  ci-dessus) — jamais de `db.delete()` sur ces trois modèles depuis un
  endpoint applicatif.
- **Nouvelles tables** : suivre le style de `database.py` (UUID PK via
  `default=uuid4`, `created_at`/`updated_at`), migration Alembic à la
  main dans `alembic/versions/`.
- **Traitement lourd** : reste synchrone dans un `BackgroundTasks` de
  FastAPI — pas de file de tâches distribuée actuellement.
