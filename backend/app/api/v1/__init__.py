"""
API v1 - Points d'extrémité

Regroupe tous les routeurs de l'API v1.
"""

from fastapi import APIRouter

from app.api.v1 import upload, jobs, models, elements, auth, quota, price_catalog, tenants, clients, projects

api_router = APIRouter()

# Inclure les routeurs
api_router.include_router(auth.router)
api_router.include_router(upload.router)
api_router.include_router(jobs.router)
api_router.include_router(models.router)
api_router.include_router(elements.router)
api_router.include_router(quota.router)
api_router.include_router(price_catalog.router)
api_router.include_router(tenants.router)
api_router.include_router(clients.router)
api_router.include_router(projects.router)
