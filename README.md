# Plateforme SaaS IFCXML Entreprise

Une plateforme SaaS prête pour la production permettant d'uploader, valider, parser et explorer des fichiers IFCXML.

## 🎉 État du Projet

**Toutes les phases sont terminées !**

✅ Phase 1: Architecture & Squelette  
✅ Phase 2: Upload & Validation  
✅ Phase 3: Parseur en Streaming  
✅ Phase 4: Transformation XSLT  
✅ Phase 5: Interface Frontend  
✅ Phase 6: Durcissement SaaS  

## 🚀 Démarrage Rapide

### Backend

```bash
# Option 1: Docker (Recommandé)
docker-compose up -d

# Option 2: Local
cd backend
./start.sh  # ou start.bat sur Windows
```

📚 **Guide complet**: [backend/DEPLOYMENT.md](./backend/DEPLOYMENT.md)  
⚡ **Démarrage rapide**: [DEPLOYMENT_QUICKSTART.md](./DEPLOYMENT_QUICKSTART.md)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📖 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture système
- [EXPLORER.md](./EXPLORER.md) - Explorateur d'éléments IFC
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Schéma de base de données
- [backend/DEPLOYMENT.md](./backend/DEPLOYMENT.md) - Guide de déploiement backend
- [PROJET_COMPLET.md](./PROJET_COMPLET.md) - Vue d'ensemble complète

## 🏗️ Structure du Projet

```
archiparse/
├── backend/              # Application FastAPI
│   ├── app/             # Code source
│   ├── scripts/         # Scripts utilitaires
│   ├── migrations/      # Migrations SQL
│   ├── DEPLOYMENT.md    # Guide de déploiement
│   └── requirements.txt # Dépendances Python
│
├── frontend/            # Application Next.js
│   ├── app/             # Pages Next.js
│   ├── components/      # Composants React
│   └── lib/             # Utilitaires et hooks
│
├── xsd/                 # Schémas XSD
│   ├── IFC2X3.xsd
│   └── ifcXML4.xsd
│
├── docker-compose.yml    # Configuration Docker
└── README.md            # Ce fichier
```

## 🔧 Configuration

### Backend

1. Copier `backend/.env.example` vers `backend/.env`
2. Configurer les variables d'environnement
3. Créer la base de données PostgreSQL
4. Appliquer les migrations: `alembic upgrade head`
5. Créer un locataire: `python scripts/create_tenant.py`

### Frontend

1. Créer `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📊 Fonctionnalités

- ✅ Upload de fichiers IFCXML (drag-and-drop)
- ✅ Validation XSD automatique (IFC2X3 et IFC4)
- ✅ Parsing en streaming (support fichiers volumineux)
- ✅ Résolution complète des Psets/Qtos (valeurs réelles, pas des références)
- ✅ Explorateur d'éléments (liste par type, étage, Psets, quantités)
- ✅ Recherche et filtrage des éléments
- ✅ Authentification JWT
- ✅ Multi-tenant avec isolation complète
- ✅ Quotas et limites configurables
- ✅ Logs d'audit complets

## 🛠️ Technologies

- **Backend**: FastAPI, PostgreSQL, Celery
- **Frontend**: Next.js 14+, React, TypeScript
- **XML**: lxml (streaming)
- **Base de données**: PostgreSQL 14+ avec JSONB

## 📝 Points d'Extrémité API

- `POST /api/v1/auth/register` - Enregistrement
- `POST /api/v1/auth/login` - Connexion
- `POST /api/v1/upload` - Upload de fichier
- `GET /api/v1/jobs` - Liste des tâches
- `GET /api/v1/models` - Liste des modèles
- `GET /api/v1/elements` - Liste des éléments
- `GET /api/v1/quota/usage` - Utilisation des quotas

Documentation interactive: http://localhost:8000/docs

## 🔒 Sécurité

- Authentification JWT
- Isolation multi-tenant
- Quotas et limites
- Logs d'audit
- Row-Level Security (RLS)

## 📚 Guides

- [Déploiement Backend](./backend/DEPLOYMENT.md)
- [Démarrage Rapide](./DEPLOYMENT_QUICKSTART.md)
- [Architecture](./ARCHITECTURE.md)
- [Explorateur IFC](./EXPLORER.md)
- [Schéma Base de Données](./DATABASE_SCHEMA.md)

## 🎯 Prochaines Étapes

La plateforme est complète et prête pour la production. Améliorations possibles:

- Interface d'administration
- Notifications par email
- Export de données
- Visualisation 3D
- Support IFC5

## 📞 Support

Pour toute question, consulter la documentation dans les fichiers `.md` du projet.

---

**Félicitations ! La plateforme est complète et prête à être utilisée ! 🎉**
