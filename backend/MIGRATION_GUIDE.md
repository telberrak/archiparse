# Guide de Migration de Base de Données

## ⚠️ Avant de Commencer

Assurez-vous que:
1. PostgreSQL est installé et en cours d'exécution
2. La base de données `archiparse` existe
3. Le fichier `.env` est configuré avec les bonnes credentials

## 📝 Configuration de .env

Créez ou modifiez le fichier `.env` dans le dossier `backend/`:

```env
DATABASE_URL=postgresql://votre_user:votre_password@localhost:5432/archiparse
```

**Exemple:**
```env
DATABASE_URL=postgresql://postgres:monmotdepasse@localhost:5432/archiparse
```

## 🗄️ Créer la Base de Données

### Option 1: Avec psql

```bash
psql -U postgres
CREATE DATABASE archiparse;
\q
```

### Option 2: Avec createdb

```bash
createdb -U postgres archiparse
```

## 🚀 Exécuter les Migrations

### 1. Activer l'Environnement Virtuel

```bash
# Windows (Git Bash)
source venv/Scripts/activate

# Windows (PowerShell)
venv\Scripts\Activate.ps1

# Linux/Mac
source venv/bin/activate
```

### 2. Installer les Dépendances

```bash
pip install -r requirements.txt
```

### 3. Créer la Migration Initiale (si nécessaire)

```bash
alembic revision --autogenerate -m "Initial migration"
```

### 4. Appliquer les Migrations

```bash
alembic upgrade head
```

## ✅ Vérifier les Migrations

```bash
# Voir l'état actuel
alembic current

# Voir l'historique
alembic history
```

## 🔧 Dépannage

### Erreur: "password authentication failed"

Vérifiez que:
- Le mot de passe dans `.env` est correct
- L'utilisateur PostgreSQL existe
- PostgreSQL accepte les connexions locales

### Erreur: "database does not exist"

Créez la base de données:
```sql
CREATE DATABASE archiparse;
```

### Erreur: "connection refused"

Vérifiez que PostgreSQL est démarré:
```bash
# Windows
net start postgresql-x64-14

# Linux
sudo systemctl start postgresql
```

### Réinitialiser les Migrations

Si vous devez recommencer:

```bash
# Supprimer toutes les tables (ATTENTION: supprime les données!)
# Connectez-vous à PostgreSQL et exécutez:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Puis réappliquez les migrations
alembic upgrade head
```

## 📚 Commandes Utiles

```bash
# Créer une nouvelle migration
alembic revision --autogenerate -m "Description de la migration"

# Appliquer toutes les migrations en attente
alembic upgrade head

# Revenir à une version précédente
alembic downgrade -1

# Voir le SQL qui sera exécuté (sans l'exécuter)
alembic upgrade head --sql
```





