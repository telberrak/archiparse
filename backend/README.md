# Backend - Application FastAPI

## 🚀 Démarrage Rapide

### Option 1: Docker (Recommandé)

```bash
# À la racine du projet
docker-compose up -d

# Voir les logs
docker-compose logs -f backend
```

### Option 2: Local

```bash
# Windows
start.bat

# Linux/Mac
chmod +x start.sh
./start.sh
```

### Option 3: Manuel

```bash
# Créer environnement virtuel
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Installer dépendances
pip install -r requirements.txt

# Configurer .env (copier .env.example)
cp .env.example .env
# Éditer .env avec vos paramètres

# Créer la base de données PostgreSQL
createdb archiparse

# Appliquer migrations
alembic upgrade head

# Activer RLS
psql -U postgres -d archiparse -f migrations/001_enable_rls.sql

# Créer locataire et utilisateur
python scripts/create_tenant.py

# Démarrer
uvicorn app.main:app --reload
```

📚 **Documentation complète**: Voir [DEPLOYMENT.md](./DEPLOYMENT.md)  
⚡ **Démarrage rapide**: Voir [../DEPLOYMENT_QUICKSTART.md](../DEPLOYMENT_QUICKSTART.md)

## 📋 Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── upload.py          # Points d'extrémité d'upload de fichiers
│   │       ├── jobs.py             # Points d'extrémité de statut des tâches
│   │       ├── models.py           # Points d'extrémité de requête de modèles
│   │       ├── elements.py         # Points d'extrémité de requête d'éléments
│   │       ├── auth.py             # Points d'extrémité d'authentification
│   │       └── quota.py            # Points d'extrémité de quotas
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               # Configuration de l'application
│   │   ├── database.py             # Connexion & session base de données
│   │   ├── security.py             # Utilitaires d'authentification JWT
│   │   └── dependencies.py         # Dépendances FastAPI
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── database.py             # Modèles ORM SQLAlchemy
│   │   └── schemas.py               # Modèles Pydantic requête/réponse
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── upload_service.py       # Gestion des uploads de fichiers
│   │   ├── validation_service.py   # Validation XSD
│   │   ├── parser_service.py       # Parseur IFCXML en streaming (résout aussi Psets/Qtos)
│   │   ├── quota_service.py        # Gestion des quotas
│   │   └── audit_service.py        # Logs d'audit
│   │
│   ├── workers/
│   │   ├── __init__.py
│   │   └── processing_worker.py    # Processeur de tâches en arrière-plan
│   │
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── auth_middleware.py      # Middleware d'authentification
│   │   └── tenant_middleware.py    # Isolation multi-locataire
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── xml_utils.py            # Utilitaires de parsing XML
│   │   └── ifc_utils.py            # Utilitaires spécifiques IFC
│   │
│   ├── __init__.py
│   └── main.py                     # Point d'entrée de l'application FastAPI
│
├── scripts/
│   ├── create_tenant.py            # Script pour créer locataire et utilisateur
│   └── init_db.py                  # Script pour initialiser la base de données
│
├── migrations/
│   └── 001_enable_rls.sql          # Migration pour activer RLS
│
├── tests/
│   ├── __init__.py
│   ├── test_validation.py
│   └── test_parser.py
│
├── requirements.txt
├── Dockerfile
├── .env.example
├── start.sh                        # Script de démarrage (Linux/Mac)
├── start.bat                       # Script de démarrage (Windows)
├── DEPLOYMENT.md                   # Guide de déploiement complet
└── README.md                       # Ce fichier
```

## Composants Clés

### Couche API (`app/api/v1/`)
Points d'extrémité RESTful suivant les standards OpenAPI. Tous les points d'extrémité sont versionnés.

### Core (`app/core/`)
- **config.py**: Configuration basée sur l'environnement (base de données, stockage, limites)
- **database.py**: Configuration SQLAlchemy, gestion de session
- **security.py**: Authentification JWT, hachage de mots de passe
- **dependencies.py**: Injection de dépendances FastAPI (contexte locataire, session DB)

### Modèles (`app/models/`)
- **database.py**: Modèles ORM SQLAlchemy correspondant au schéma de base de données
- **schemas.py**: Modèles Pydantic pour validation requête/réponse

### Services (`app/services/`)
Couche de logique métier. Tous les services sont sans état et testables.

### Workers (`app/workers/`)
Traitement de tâches en arrière-plan utilisant Celery ou RQ.

### Middleware (`app/middleware/`)
- **auth_middleware.py**: Authentification JWT et extraction du tenant
- **tenant_middleware.py**: Isolation et vérification des locataires

## Dépendances

- fastapi
- uvicorn
- sqlalchemy
- psycopg2-binary
- alembic (migrations)
- pydantic
- pydantic[email]
- lxml (parsing XML)
- python-jose[cryptography] (JWT)
- passlib[bcrypt] (hachage de mots de passe)

## Configuration

### Variables d'Environnement

Créer un fichier `.env` basé sur `.env.example`:

```env
SECRET_KEY=votre_cle_secrete_aleatoire
DATABASE_URL=postgresql://user:password@localhost:5432/archiparse
REDIS_URL=redis://localhost:6379/0
DEBUG=False
```

### Générer une Clé Secrète

```python
import secrets
print(secrets.token_urlsafe(32))
```

## Points d'Extrémité API

### Authentification
- `POST /api/v1/auth/register` - Enregistrement d'utilisateur
- `POST /api/v1/auth/login` - Connexion (retourne JWT)
- `GET /api/v1/auth/me` - Informations utilisateur actuel

### Upload
- `POST /api/v1/upload` - Upload de fichier IFCXML (avec vérification quotas)

### Tâches
- `GET /api/v1/jobs` - Liste des tâches
- `GET /api/v1/jobs/{id}` - Détails d'une tâche

### Modèles
- `GET /api/v1/models` - Liste des modèles
- `GET /api/v1/models/{id}` - Détails d'un modèle

### Éléments
- `GET /api/v1/elements` - Liste des éléments (avec filtres)
- `GET /api/v1/elements/{id}` - Détails d'un élément

### Quotas
- `GET /api/v1/quota/usage` - Utilisation des quotas

## Documentation Interactive

Une fois le serveur démarré, accéder à:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔒 Sécurité

- Authentification JWT obligatoire (sauf `/auth/register` et `/auth/login`)
- Isolation complète des locataires
- Vérification des quotas avant chaque upload
- Logs d'audit de toutes les actions
- Support Row-Level Security (RLS)

## 📚 Documentation Complète

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guide de déploiement complet
- [../DEPLOYMENT_QUICKSTART.md](../DEPLOYMENT_QUICKSTART.md) - Démarrage rapide
- [../ARCHITECTURE.md](../ARCHITECTURE.md) - Architecture système
