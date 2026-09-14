# Déploiement

## Démarrage rapide (Docker, recommandé)

```bash
./run.sh                 # démarre en mode « prod-like » (docker-compose.yml)
./run.sh dev              # mode développement (hot-reload, docker-compose.dev.yml)
./run.sh alt               # mode alternatif (frontend sur le port 3001, docker-compose.alt.yml)
./run.sh --build           # force la reconstruction des images avant de démarrer
./run.sh dev --build       # combine un mode et une reconstruction
./run.sh down              # arrête les services du mode par défaut
./run.sh dev down          # arrête les services du mode dev
./run.sh logs [service]    # suit les logs (tous les services, ou un seul : backend/frontend/postgres/redis)
```

`run.sh` attend que `GET /docs` réponde, puis affiche les URLs et les
identifiants par défaut. Équivalent manuel sans le script :

```bash
docker compose up -d
```

Au démarrage, le conteneur backend attend PostgreSQL, applique les
migrations Alembic (`alembic upgrade head`), tente d'activer RLS
(`migrations/001_enable_rls.sql`, silencieusement ignoré s'il l'est déjà),
puis lance Uvicorn — voir la `command:` du service `backend` dans
`docker-compose.yml`. Rien de manuel n'est requis après `up -d`.

### URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 (ou :3001 en mode `alt`) |
| API | http://localhost:8000 |
| Documentation interactive (Swagger) | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| PostgreSQL | localhost:5432 (db `archiparse`, user `postgres`) |
| Redis | localhost:6379 (présent, non consommé par le code applicatif actuellement) |

### Créer un compte

Le plus simple : ouvrir http://localhost:3000/signup — ça crée le tenant
et le premier utilisateur en un flux. Alternative en ligne de commande
(utile en scripts/CI) :

```bash
docker compose exec backend python scripts/create_tenant_auto.py \
  --name "Mon Cabinet" --email "admin@example.com" --password "motdepasse"
```

Identifiants par défaut utilisés en développement dans ce dépôt :
`admin@example.com` / `admin123`.

## Configuration

### Variables d'environnement (backend)

Toutes définies dans `backend/app/core/config.py` (Pydantic Settings, lit
`backend/.env` en local, ou l'environnement du conteneur en Docker — voir
`backend/.env.example` pour un gabarit). En Docker, `docker-compose.yml`
fixe déjà `DATABASE_URL`, `REDIS_URL`, `UPLOAD_DIR`, `XSD_DIR` ; il reste
à fournir `SECRET_KEY` et, pour que la réinitialisation de mot de passe
envoie réellement un e-mail, les variables `SMTP_*`.

| Variable | Défaut | Notes |
|---|---|---|
| `SECRET_KEY` | *(placeholder)* | **à changer en production** — `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `DATABASE_URL` | — | `postgresql://user:password@host:5432/archiparse` |
| `DEBUG` | `False` | |
| `UPLOAD_DIR` | `uploads` | scopé par tenant sous ce répertoire |
| `MAX_FILE_SIZE` | 500 Mo | |
| `XSD_DIR`, `XSD_IFC2X3`, `XSD_IFC4` | `xsd/` relatif | |
| `REDIS_URL` | `redis://localhost:6379/0` | non consommé actuellement |
| `CORS_ORIGINS` | `["http://localhost:3000","http://localhost:3001"]` | liste ou JSON string |
| `FRONTEND_URL` | `http://localhost:3000` | utilisé dans les liens des e-mails |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_USE_TLS` | *(vides)* | réinitialisation de mot de passe ; échoue silencieusement (log, pas d'exception) si non configuré — voir `email_service.py`. Pour Gmail : `smtp.gmail.com:587` + un [mot de passe d'application](https://myaccount.google.com/apppasswords), jamais le mot de passe du compte |
| `DEFAULT_TENANT_ID` | — | dev uniquement |

### Frontend

`NEXT_PUBLIC_API_URL` — passé en argument de build Docker
(`docker-compose.yml`, défaut `http://localhost:8000`) ou dans
`frontend/.env.local` en local :

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Sans Docker (local)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows Git Bash: source venv/Scripts/activate
pip install -r requirements.txt

cp .env.example .env            # puis éditer .env (DATABASE_URL, SECRET_KEY, ...)

createdb archiparse             # ou: psql -U postgres -c "CREATE DATABASE archiparse;"
alembic upgrade head
psql -U postgres -d archiparse -f migrations/001_enable_rls.sql   # optionnel mais recommandé

python scripts/create_tenant_auto.py --name "Mon Cabinet" --email "admin@example.com" --password "motdepasse"
# ou le script interactif : python scripts/create_tenant.py

uvicorn app.main:app --reload
```

Sur Windows avec Git Bash : utiliser des `/` (pas de `\`) et
`source venv/Scripts/activate`. `(venv)` doit apparaître dans le prompt
une fois activé.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Dépannage

**`password authentication failed for user "..."`** — le format de
`DATABASE_URL` est `postgresql://[user]:[password]@[host]:[port]/[database]`.
En dev, le plus simple est d'utiliser l'utilisateur `postgres` avec le mot
de passe défini lors de l'installation de PostgreSQL, plutôt que de créer
un utilisateur dédié.

**`database does not exist`** — `createdb archiparse` ou
`CREATE DATABASE archiparse;` via `psql -U postgres`.

**`connection refused`** — PostgreSQL n'est pas démarré
(`sudo systemctl start postgresql`, ou vérifier le service Windows).

**Les migrations ne s'appliquent pas en Docker** —
`docker compose exec backend alembic upgrade head` manuellement ; puis
`docker compose exec backend alembic current` pour vérifier la révision
appliquée.

**Repartir de zéro (⚠️ supprime toutes les données)** —

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```
puis `alembic upgrade head`.

**Le frontend ne peut pas joindre le backend (Docker)** — vérifier que
`NEXT_PUBLIC_API_URL` pointe vers `http://backend:8000` côté conteneur, et
que les deux services sont sur le réseau `archiparse_network`.

**CORS** — `CORS_ORIGINS` côté backend doit inclure l'origine du
frontend (`http://localhost:3000` en dev, `http://frontend:3000` entre
conteneurs).

## Commandes Docker utiles

```bash
docker compose logs -f [service]              # logs
docker compose exec backend bash              # shell dans le conteneur backend
docker compose exec backend alembic upgrade head
docker compose restart backend
docker compose build backend && docker compose up -d backend   # reconstruire après un changement de code backend
docker compose down                            # arrêter
docker compose down -v                         # arrêter ET supprimer les volumes (⚠️ supprime les données)
```

Le backend est monté en volume (`./backend:/app`) : un `restart` suffit
après un changement de code Python. Le frontend est buildé dans l'image
(pas de hot-reload en mode `prod-like`) : il faut `build` puis `up -d`
après un changement de code frontend. Le mode `dev`
(`docker-compose.dev.yml`) monte aussi le frontend en volume pour le
hot-reload.

## Sauvegarde

```bash
pg_dump -U postgres archiparse > backup_$(date +%Y%m%d).sql
psql -U postgres archiparse < backup_20260101.sql
```

## Checklist avant une mise en production réelle

- [ ] `SECRET_KEY` généré aléatoirement et gardé secret
- [ ] `DEBUG=False`
- [ ] `DATABASE_URL` vers une base dédiée, utilisateur avec privilèges minimaux
- [ ] `SMTP_*` configuré (sinon la réinitialisation de mot de passe échoue silencieusement)
- [ ] `CORS_ORIGINS` restreint au(x) domaine(s) réel(s)
- [ ] Reverse proxy + TLS devant le backend (Nginx + Let's Encrypt, ou équivalent)
- [ ] Sauvegardes PostgreSQL automatisées
- [ ] Quotas par tenant revus (`max_file_size`, `max_files_per_month`, `max_storage_size`)

Ce dépôt ne fournit pas de configuration de production clé en main
(pas de manifeste Nginx/systemd/k8s inclus) — au-delà de Docker Compose,
l'infrastructure de déploiement (reverse proxy, orchestrateur, CI/CD) est
à la charge de l'environnement cible.
