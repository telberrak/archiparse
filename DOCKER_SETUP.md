# Configuration Docker - Backend et Frontend

Guide pour exécuter le backend et le frontend dans des conteneurs Docker séparés.

## 🚀 Démarrage Rapide

### Production

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

### Développement (avec hot-reload)

```bash
# Démarrer en mode développement
docker-compose -f docker-compose.dev.yml up

# Voir les logs
docker-compose -f docker-compose.dev.yml logs -f

# Arrêter
docker-compose -f docker-compose.dev.yml down
```

## 📋 Services

### Backend
- **Port**: 8000
- **URL**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Frontend
- **Port**: 3000
- **URL**: http://localhost:3000
- **API Backend**: Configuré via `NEXT_PUBLIC_API_URL`

### PostgreSQL
- **Port**: 5432
- **Database**: archiparse
- **User**: postgres (dev) ou archiparse_user (prod)

### Redis
- **Port**: 6379

## 🔧 Configuration

### Variables d'Environnement

Créez un fichier `.env` à la racine du projet:

```env
# PostgreSQL
POSTGRES_PASSWORD=Eagle1978

# Backend
SECRET_KEY=votre-cle-secrete-aleatoire
DEBUG=False
CORS_ORIGINS=["http://localhost:3000","http://frontend:3000"]

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Pour le Développement

Le fichier `docker-compose.dev.yml` utilise:
- Hot-reload pour le backend (--reload)
- Hot-reload pour le frontend (npm run dev)
- Volumes montés pour le code source

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (Next.js)              │
│         Port: 3000                       │
└──────────────┬──────────────────────────┘
               │ HTTP
               ▼
┌─────────────────────────────────────────┐
│         Backend (FastAPI)                │
│         Port: 8000                       │
└──────┬──────────────────────┬───────────┘
       │                      │
       ▼                      ▼
┌──────────────┐      ┌──────────────┐
│  PostgreSQL  │      │    Redis     │
│  Port: 5432  │      │  Port: 6379  │
└──────────────┘      └──────────────┘
```

## 📝 Commandes Utiles

### Construire les images

```bash
# Production
docker-compose build

# Développement
docker-compose -f docker-compose.dev.yml build
```

### Voir les logs

```bash
# Tous les services
docker-compose logs -f

# Un service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Exécuter des commandes dans les conteneurs

```bash
# Backend
docker-compose exec backend bash
docker-compose exec backend python scripts/create_tenant.py

# Frontend
docker-compose exec frontend sh
docker-compose exec frontend npm install
```

### Redémarrer un service

```bash
docker-compose restart backend
docker-compose restart frontend
```

### Supprimer tout et recommencer

```bash
# Arrêter et supprimer les conteneurs
docker-compose down

# Supprimer aussi les volumes (⚠️ supprime les données)
docker-compose down -v

# Reconstruire et redémarrer
docker-compose up -d --build
```

## 🔍 Dépannage

### Le frontend ne peut pas se connecter au backend

1. Vérifiez que `NEXT_PUBLIC_API_URL` pointe vers `http://backend:8000` dans Docker
2. Vérifiez que les deux services sont sur le même réseau (`archiparse_network`)
3. Vérifiez les logs: `docker-compose logs frontend`

### Erreurs de CORS

1. Vérifiez que `CORS_ORIGINS` dans le backend inclut l'URL du frontend
2. Pour Docker, ajoutez `http://frontend:3000` aux origines autorisées

### Les migrations ne s'appliquent pas

```bash
# Exécuter manuellement
docker-compose exec backend alembic upgrade head
```

### Reconstruire après des changements

```bash
# Reconstruire une image spécifique
docker-compose build backend
docker-compose build frontend

# Reconstruire et redémarrer
docker-compose up -d --build
```

## 🎯 URLs d'Accès

Une fois démarré:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 📚 Notes

- En développement, les volumes montent le code source pour le hot-reload
- En production, le code est copié dans l'image
- Les données PostgreSQL sont persistées dans un volume Docker
- Les uploads sont stockés dans un volume séparé





