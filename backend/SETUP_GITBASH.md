# Configuration avec Git Bash (Windows)

Guide spécifique pour configurer le backend avec Git Bash sur Windows.

## 🚀 Démarrage Rapide

### 1. Créer l'Environnement Virtuel

```bash
cd backend
python -m venv venv
```

### 2. Activer l'Environnement Virtuel

Sur Windows avec Git Bash, utilisez:

```bash
source venv/Scripts/activate
```

**Note**: Utilisez des slashes `/` et non des backslashes `\` dans Git Bash.

### 3. Vérifier l'Activation

Vous devriez voir `(venv)` au début de votre prompt:

```bash
(venv) telberrak@tsunami MINGW64 /d/Dev/projects/archiparse/backend
```

### 4. Installer les Dépendances

```bash
pip install -r requirements.txt
```

### 5. Configurer l'Environnement

```bash
# Copier le fichier .env.example
cp .env.example .env

# Éditer .env avec vos paramètres
# (utilisez votre éditeur préféré: nano, vim, code, etc.)
nano .env
# ou
code .env
```

### 6. Créer la Base de Données

Assurez-vous que PostgreSQL est installé et démarré, puis:

```bash
# Créer la base de données
createdb archiparse

# Ou avec psql
psql -U postgres -c "CREATE DATABASE archiparse;"
```

### 7. Appliquer les Migrations

```bash
alembic upgrade head
```

### 8. Activer RLS (Optionnel mais Recommandé)

```bash
psql -U postgres -d archiparse -f migrations/001_enable_rls.sql
```

### 9. Créer un Locataire et Utilisateur

```bash
python scripts/create_tenant.py
```

### 10. Démarrer le Serveur

```bash
uvicorn app.main:app --reload
```

## 🔧 Commandes Utiles

### Activer/Désactiver le Venv

```bash
# Activer
source venv/Scripts/activate

# Désactiver
deactivate
```

### Vérifier l'Installation

```bash
# Vérifier Python
python --version

# Vérifier pip
pip --version

# Vérifier les packages installés
pip list
```

### Problèmes Courants

#### Le venv n'existe pas
```bash
python -m venv venv
```

#### Erreur "No such file or directory"
- Vérifiez que vous êtes dans le dossier `backend`
- Utilisez `source venv/Scripts/activate` (avec slash `/`)

#### Erreur de permissions
```bash
chmod +x venv/Scripts/activate
```

## 📝 Configuration Minimale .env

Pour démarrer rapidement, créez un fichier `.env` avec au minimum:

```env
SECRET_KEY=votre_cle_secrete_aleatoire
DATABASE_URL=postgresql://user:password@localhost:5432/archiparse
DEBUG=False
```

Générer une clé secrète:
```python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```
