# Correction de la Connexion à la Base de Données

## ❌ Erreur Actuelle

```
password authentication failed for user "archiparse_user"
```

## ✅ Solutions

### Option 1: Utiliser l'utilisateur `postgres` (Recommandé pour développement)

Modifiez votre fichier `.env`:

```env
DATABASE_URL=postgresql://postgres:votre_mot_de_passe@localhost:5432/archiparse
```

Remplacez `votre_mot_de_passe` par le mot de passe de votre utilisateur `postgres`.

### Option 2: Créer l'utilisateur `archiparse_user`

Connectez-vous à PostgreSQL:

```bash
psql -U postgres
```

Puis exécutez:

```sql
CREATE USER archiparse_user WITH PASSWORD 'votre_mot_de_passe';
CREATE DATABASE archiparse OWNER archiparse_user;
GRANT ALL PRIVILEGES ON DATABASE archiparse TO archiparse_user;
\q
```

Puis mettez à jour votre `.env`:

```env
DATABASE_URL=postgresql://archiparse_user:votre_mot_de_passe@localhost:5432/archiparse
```

### Option 3: Utiliser l'authentification sans mot de passe (Windows)

Si vous utilisez l'authentification Windows intégrée:

```env
DATABASE_URL=postgresql://@localhost:5432/archiparse
```

## 🔍 Vérifier la Connexion

Testez la connexion:

```bash
psql -U postgres -d archiparse
```

Ou avec l'utilisateur spécifique:

```bash
psql -U archiparse_user -d archiparse
```

## 📝 Format de DATABASE_URL

Le format est:
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

Exemples:
- `postgresql://postgres:mypassword@localhost:5432/archiparse`
- `postgresql://user:pass@localhost:5432/archiparse`
- `postgresql://@localhost:5432/archiparse` (authentification Windows)

## ⚠️ Important

1. Ne commitez **JAMAIS** le fichier `.env` avec des mots de passe réels
2. Utilisez des mots de passe forts en production
3. Créez un utilisateur dédié pour la production





