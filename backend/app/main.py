"""
Point d'entrée de l'application FastAPI

Configure et démarre l'application FastAPI.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1 import api_router
from app.core.database import Base, engine

# Créer les tables (en développement seulement)
# En production, utiliser Alembic pour les migrations
# Base.metadata.create_all(bind=engine)  # Désactivé - utiliser Alembic

# Créer l'application FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG
)

# Configurer CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routeurs API
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    """Point d'extrémité racine"""
    return {
        "message": "Archiparse API",
        "version": settings.APP_VERSION,
        "status": "ok"
    }


@app.get("/health")
def health_check():
    """Point d'extrémité de vérification de santé"""
    return {"status": "healthy"}
