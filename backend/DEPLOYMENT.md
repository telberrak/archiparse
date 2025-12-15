# Guide de Déploiement - Backend

Guide complet pour déployer le backend Archiparse en production.

## 📋 Prérequis

- Python 3.11+
- PostgreSQL 14+
- Redis (pour Celery en production)
- Accès serveur avec permissions d'installation

## 🚀 Déploiement Local (Développement)

### 1. Installation des Dépendances

```bash
cd backend

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
# Sur Windows:
venv\Scripts\activate
# Sur Linux/Mac:
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
```

### 2. Configuration de la Base de Données

#### Créer la Base de Données PostgreSQL

```sql
-- Se connecter à PostgreSQL
psql -U postgres

-- Créer la base de données
CREATE DATABASE archiparse;

-- Créer un utilisateur (optionnel)
CREATE USER archiparse_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE archiparse TO archiparse_user;
```

#### Configuration des Variables d'Environnement

Créer un fichier `.env` dans le dossier `backend/`:

```env
# Application
APP_NAME=Archiparse API
APP_VERSION=1.0.0
DEBUG=False
SECRET_KEY=votre_cle_secrete_tres_longue_et_aleatoire_ici

# Base de données
DATABASE_URL=postgresql://archiparse_user:votre_mot_de_passe@localhost:5432/archiparse
DATABASE_ECHO=False

# Stockage
UPLOAD_DIR=uploads
MAX_FILE_SIZE=524288000  # 500MB en octets

# Redis (pour Celery)
REDIS_URL=redis://localhost:6379/0

# CORS
CORS_ORIGINS=["http://localhost:3000","https://votre-domaine.com"]

# Locataire par défaut (développement seulement)
# DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000000
```

**⚠️ IMPORTANT**: Changez `SECRET_KEY` en production avec une clé aléatoire sécurisée !

Générer une clé secrète:
```python
import secrets
print(secrets.token_urlsafe(32))
```

### 3. Migrations de Base de Données

```bash
# Initialiser Alembic (si pas déjà fait)
alembic init alembic

# Créer une migration initiale
alembic revision --autogenerate -m "Initial migration"

# Appliquer les migrations
alembic upgrade head

# Appliquer RLS (Row-Level Security)
psql -U archiparse_user -d archiparse -f migrations/001_enable_rls.sql
```

### 4. Créer un Locataire et Utilisateur Initial

```python
# Script: backend/scripts/create_tenant.py
from app.core.database import SessionLocal
from app.models.database import Tenant, User
from app.core.security import get_password_hash
from uuid import uuid4

db = SessionLocal()

# Créer un locataire
tenant = Tenant(
    id=uuid4(),
    name="Locataire Principal",
    slug="principal",
    is_active=True,
    max_file_size=500 * 1024 * 1024,  # 500MB
    max_files_per_month=100,
    max_storage_size=10 * 1024 * 1024 * 1024  # 10GB
)
db.add(tenant)
db.commit()

# Créer un utilisateur admin
admin_user = User(
    tenant_id=tenant.id,
    email="admin@example.com",
    hashed_password=get_password_hash("mot_de_passe_securise"),
    full_name="Administrateur",
    is_active=True,
    is_superuser=True
)
db.add(admin_user)
db.commit()

print(f"Locataire créé: {tenant.id}")
print(f"Utilisateur créé: {admin_user.id}")
db.close()
```

Exécuter:
```bash
python scripts/create_tenant.py
```

### 5. Démarrer le Serveur

```bash
# Mode développement
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Mode production (avec workers)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 🐳 Déploiement avec Docker

### 1. Créer Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copier requirements et installer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code
COPY . .

# Exposer le port
EXPOSE 8000

# Commande par défaut
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Créer docker-compose.yml

```yaml
# docker-compose.yml (à la racine du projet)
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: archiparse
      POSTGRES_USER: archiparse_user
      POSTGRES_PASSWORD: votre_mot_de_passe
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U archiparse_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://archiparse_user:votre_mot_de_passe@postgres:5432/archiparse
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: votre_cle_secrete
      CORS_ORIGINS: '["http://localhost:3000"]'
    volumes:
      - ./backend:/app
      - uploads_data:/app/uploads
      - ./xsd:/app/xsd:ro
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: >
      sh -c "
        alembic upgrade head &&
        uvicorn app.main:app --host 0.0.0.0 --port 8000
      "

  celery-worker:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://archiparse_user:votre_mot_de_passe@postgres:5432/archiparse
      REDIS_URL: redis://redis:6379/0
    volumes:
      - ./backend:/app
      - uploads_data:/app/uploads
    depends_on:
      - postgres
      - redis
    command: celery -A app.workers.celery_app worker --loglevel=info

volumes:
  postgres_data:
  uploads_data:
```

### 3. Déployer avec Docker Compose

```bash
# Construire et démarrer
docker-compose up -d

# Voir les logs
docker-compose logs -f backend

# Arrêter
docker-compose down

# Arrêter et supprimer les volumes
docker-compose down -v
```

## ☁️ Déploiement en Production

### Option 1: Serveur Dédié (Ubuntu/Debian)

#### 1. Installation des Dépendances Système

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Python et dépendances
sudo apt install -y python3.11 python3.11-venv python3-pip postgresql-14 redis-server nginx

# Installer PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 2. Configuration PostgreSQL

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Créer la base de données
CREATE DATABASE archiparse;
CREATE USER archiparse_user WITH PASSWORD 'mot_de_passe_securise';
GRANT ALL PRIVILEGES ON DATABASE archiparse TO archiparse_user;
\q
```

#### 3. Configuration Redis

```bash
# Démarrer Redis
sudo systemctl start redis
sudo systemctl enable redis
```

#### 4. Déployer l'Application

```bash
# Créer un utilisateur pour l'application
sudo useradd -m -s /bin/bash archiparse

# Cloner ou copier le code
sudo mkdir -p /opt/archiparse
sudo chown archiparse:archiparse /opt/archiparse
cd /opt/archiparse

# Copier les fichiers backend
# (depuis votre machine de développement)

# Créer l'environnement virtuel
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 5. Configuration Systemd

Créer `/etc/systemd/system/archiparse.service`:

```ini
[Unit]
Description=Archiparse API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=archiparse
WorkingDirectory=/opt/archiparse/backend
Environment="PATH=/opt/archiparse/venv/bin"
ExecStart=/opt/archiparse/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Activer le service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable archiparse
sudo systemctl start archiparse
sudo systemctl status archiparse
```

#### 6. Configuration Nginx (Reverse Proxy)

Créer `/etc/nginx/sites-available/archiparse`:

```nginx
server {
    listen 80;
    server_name api.votre-domaine.com;

    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activer:
```bash
sudo ln -s /etc/nginx/sites-available/archiparse /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 7. Configuration SSL avec Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.votre-domaine.com
```

### Option 2: Plateforme Cloud (Heroku, Railway, Render)

#### Heroku

```bash
# Installer Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Se connecter
heroku login

# Créer l'application
heroku create archiparse-api

# Ajouter les add-ons
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini

# Configurer les variables d'environnement
heroku config:set SECRET_KEY="votre_cle_secrete"
heroku config:set DEBUG=False

# Déployer
git push heroku main

# Exécuter les migrations
heroku run alembic upgrade head
```

#### Railway

1. Connecter votre dépôt GitHub
2. Créer un nouveau projet
3. Ajouter PostgreSQL et Redis
4. Configurer les variables d'environnement
5. Déployer automatiquement

#### Render

1. Créer un nouveau Web Service
2. Connecter le dépôt Git
3. Configurer:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Ajouter PostgreSQL et Redis
5. Configurer les variables d'environnement

## 🔧 Configuration Avancée

### Variables d'Environnement Complètes

```env
# Application
APP_NAME=Archiparse API
APP_VERSION=1.0.0
DEBUG=False
SECRET_KEY=changez-moi-en-production

# Base de données
DATABASE_URL=postgresql://user:password@host:5432/dbname
DATABASE_ECHO=False

# Stockage
UPLOAD_DIR=/var/archiparse/uploads
MAX_FILE_SIZE=524288000
ALLOWED_EXTENSIONS=[".ifcxml",".xml"]

# XSD (chemins relatifs ou absolus)
XSD_DIR=/opt/archiparse/xsd
XSD_IFC2X3=/opt/archiparse/xsd/IFC2X3.xsd
XSD_IFC4=/opt/archiparse/xsd/ifcXML4.xsd

# Redis
REDIS_URL=redis://localhost:6379/0

# CORS
CORS_ORIGINS=["https://votre-domaine.com"]

# Locataire par défaut (développement seulement)
# DEFAULT_TENANT_ID=
```

### Optimisations Production

#### Gunicorn avec Uvicorn Workers

```bash
pip install gunicorn

# Démarrer avec Gunicorn
gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --max-requests 1000 \
    --max-requests-jitter 50
```

#### Configuration Nginx Avancée

```nginx
upstream archiparse_backend {
    least_conn;
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
    server 127.0.0.1:8003;
}

server {
    listen 80;
    server_name api.votre-domaine.com;

    client_max_body_size 500M;
    client_body_timeout 300s;

    location / {
        proxy_pass http://archiparse_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

## 🔍 Vérification du Déploiement

### Tests de Santé

```bash
# Vérifier que l'API répond
curl http://localhost:8000/health

# Vérifier la documentation
curl http://localhost:8000/docs

# Tester l'authentification
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"mot_de_passe"}'
```

### Monitoring

- Logs: `journalctl -u archiparse -f` (systemd)
- Métriques: Intégrer Prometheus/Grafana
- Alertes: Configurer des alertes sur les erreurs

## 🛠️ Maintenance

### Mises à Jour

```bash
# Mettre à jour le code
git pull origin main

# Mettre à jour les dépendances
pip install -r requirements.txt --upgrade

# Appliquer les migrations
alembic upgrade head

# Redémarrer le service
sudo systemctl restart archiparse
```

### Sauvegarde

```bash
# Sauvegarder la base de données
pg_dump -U archiparse_user archiparse > backup_$(date +%Y%m%d).sql

# Restaurer
psql -U archiparse_user archiparse < backup_20231214.sql
```

## ⚠️ Checklist Production

- [ ] `SECRET_KEY` changé et sécurisé
- [ ] `DEBUG=False` en production
- [ ] Base de données configurée avec utilisateur dédié
- [ ] Migrations appliquées
- [ ] RLS activé
- [ ] SSL/HTTPS configuré
- [ ] CORS configuré correctement
- [ ] Quotas configurés par locataire
- [ ] Logs d'audit activés
- [ ] Sauvegardes automatiques configurées
- [ ] Monitoring en place

## 📞 Support

Pour toute question ou problème, consulter:
- Documentation: `README.md`
- Architecture: `ARCHITECTURE.md`
- Logs: `/var/log/archiparse/` ou `journalctl -u archiparse`





