@echo off
REM Script de démarrage pour le backend (Windows)

echo 🚀 Démarrage d'Archiparse Backend...

REM Vérifier que l'environnement virtuel existe
if not exist "venv" (
    echo 📦 Création de l'environnement virtuel...
    python -m venv venv
)

REM Activer l'environnement virtuel
echo 🔌 Activation de l'environnement virtuel...
call venv\Scripts\activate.bat

REM Installer les dépendances
echo 📥 Installation des dépendances...
pip install -q -r requirements.txt

REM Vérifier que .env existe
if not exist ".env" (
    echo ⚠️  Fichier .env non trouvé. Copie de .env.example...
    copy .env.example .env
    echo ⚠️  Veuillez configurer le fichier .env avant de continuer!
    pause
    exit /b 1
)

REM Démarrer le serveur
echo 🌟 Démarrage du serveur...
echo 📍 API disponible sur http://localhost:8000
echo 📚 Documentation sur http://localhost:8000/docs
echo.

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload





