#!/bin/bash
# Script de démarrage pour le backend

set -e

echo "🚀 Démarrage d'Archiparse Backend..."

# Vérifier que l'environnement virtuel existe
if [ ! -d "venv" ]; then
    echo "📦 Création de l'environnement virtuel..."
    python3 -m venv venv
fi

# Activer l'environnement virtuel
echo "🔌 Activation de l'environnement virtuel..."
source venv/bin/activate

# Installer les dépendances
echo "📥 Installation des dépendances..."
pip install -q -r requirements.txt

# Vérifier que .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env non trouvé. Copie de .env.example..."
    cp .env.example .env
    echo "⚠️  Veuillez configurer le fichier .env avant de continuer!"
    exit 1
fi

# Vérifier la connexion à la base de données
echo "🔍 Vérification de la connexion à la base de données..."
python -c "
from app.core.database import engine
try:
    with engine.connect() as conn:
        print('✅ Connexion à la base de données réussie')
except Exception as e:
    print(f'❌ Erreur de connexion à la base de données: {e}')
    exit(1)
" || exit 1

# Appliquer les migrations
echo "🔄 Application des migrations..."
alembic upgrade head || echo "⚠️  Erreur lors des migrations (peut être normal si déjà appliquées)"

# Démarrer le serveur
echo "🌟 Démarrage du serveur..."
echo "📍 API disponible sur http://localhost:8000"
echo "📚 Documentation sur http://localhost:8000/docs"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload





