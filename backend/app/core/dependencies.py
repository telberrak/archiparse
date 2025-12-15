"""
Dépendances FastAPI

Dépendances réutilisables pour l'injection dans les routes.
"""

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.core.config import settings
from app.middleware.auth_middleware import get_tenant_id_optional, get_tenant_id as get_tenant_id_from_auth
from app.middleware.tenant_middleware import verify_tenant_access


def get_tenant_id(
    tenant_id: Optional[UUID] = Depends(get_tenant_id_optional)
) -> UUID:
    """
    Dépendance pour obtenir le tenant ID.
    Utilise l'authentification JWT si disponible, sinon l'en-tête X-Tenant-ID.
    
    Args:
        tenant_id: Tenant ID optionnel depuis get_tenant_id_optional
        
    Returns:
        UUID: ID du locataire
        
    Raises:
        HTTPException: Si aucun ID de locataire n'est fourni
    """
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise. Fournissez un token JWT ou un en-tête X-Tenant-ID"
        )
    return tenant_id


def get_verified_tenant(
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db)
):
    """
    Dépendance pour obtenir et vérifier le locataire.
    
    Args:
        tenant_id: ID du locataire
        db: Session de base de données
        
    Returns:
        Tenant: Locataire vérifié
    """
    return verify_tenant_access(tenant_id, db)


def get_db_session(
    db: Session = Depends(get_db)
) -> Session:
    """
    Dépendance pour obtenir une session de base de données.
    
    Args:
        db: Session de base de données depuis get_db()
        
    Returns:
        Session: Session SQLAlchemy
    """
    return db

