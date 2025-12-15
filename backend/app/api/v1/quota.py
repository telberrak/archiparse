"""
Points d'extrémité pour les quotas

Gère la consultation des quotas et limites.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_verified_tenant, get_db_session
from app.models.database import Tenant
from app.services.quota_service import quota_service

router = APIRouter(prefix="/quota", tags=["quota"])


@router.get("/usage")
def get_quota_usage(
    tenant: Tenant = Depends(get_verified_tenant),
    db: Session = Depends(get_db_session)
):
    """
    Retourne l'utilisation des quotas du locataire.
    
    Args:
        tenant: Locataire vérifié
        db: Session de base de données
        
    Returns:
        Informations sur l'utilisation des quotas
    """
    return quota_service.get_quota_usage(tenant, db)





