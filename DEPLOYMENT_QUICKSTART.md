# Guide de Déploiement Rapide

Guide rapide pour démarrer le backend en quelques minutes.

## 🚀 Démarrage Rapide avec Docker

### 1. Préparer l'Environnement

```bash
# Créer un fichier .env à la racine
cat > .env << EOF
POSTGRES_PASSWORD=secure_password_here
SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
DEBUG=False
CORS_ORIGINS=["http://localhost:3000"]
EOF
```

### 2. Démarrer avec Docker Compose

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f backend

# Vérifier que tout fonctionne
curl http://localhost:8000/health
```

### 3. Créer un Locataire et Utilisateur

```bash
# Entrer dans le conteneur backend
docker-compose exec backend bash

# Créer le locataire et l'admin
python scripts/create_tenant.py

# Sortir du conteneur
exit
```

### 4. Accéder à l'API

- API: http://localhost:8000
- Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## 🖥️ Démarrage Local (Sans Docker)

### 1. Prérequis

- PostgreSQL 14+ en cours d'exécution
- Redis en cours d'exécution (optionnel)

### 2. Installation

```bash
cd backend

# Créer environnement virtuel
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Installer dépendances
pip install -r requirements.txt

# Copier .env.example vers .env et configurer
cp .env.example .env
# Éditer .env avec vos paramètres
```

### 3. Base de Données

```bash
# Créer la base de données
createdb archiparse

# Appliquer les migrations
alembic upgrade head

# Activer RLS
psql -U postgres -d archiparse -f migrations/001_enable_rls.sql
```

### 4. Créer Locataire et Utilisateur

```bash
python scripts/create_tenant.py
```

### 5. Démarrer le Serveur

```bash
uvicorn app.main:app --reload
```

## ✅ Vérification

### Tester l'API

```bash
# Health check
curl http://localhost:8000/health

# Se connecter
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"votre_mot_de_passe"}'
```

### Tester l'Upload

```bash
# Obtenir un token (remplacer avec votre token)
TOKEN="votre_token_jwt"

# Upload un fichier
curl -X POST http://localhost:8000/api/v1/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@votre_fichier.ifcxml"
```

## 🔧 Configuration Minimale

Fichier `.env` minimal:

```env
SECRET_KEY=votre_cle_secrete_aleatoire
DATABASE_URL=postgresql://user:password@localhost:5432/archiparse
REDIS_URL=redis://localhost:6379/0
DEBUG=False
```

## 📚 Documentation Complète

Pour plus de détails, voir:
- `backend/DEPLOYMENT.md` - Guide complet de déploiement
- `README.md` - Documentation générale

## 🆘 Problèmes Courants

### Erreur de connexion PostgreSQL
- Vérifier que PostgreSQL est démarré
- Vérifier les credentials dans `.env`
- Vérifier que la base de données existe

### Erreur de migration
- Vérifier que la base de données est vide ou compatible
- Exécuter `alembic upgrade head` manuellement

### Port déjà utilisé
- Changer le port dans `docker-compose.yml` ou la commande uvicorn
- Vérifier qu'aucun autre service n'utilise le port 8000





