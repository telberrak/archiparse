"""
Middleware d'isolation des locataires

Assure l'isolation complète des données entre locataires.
"""

from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Callable

from app.core.database import get_db
from app.models.database import Tenant


def verify_tenant_access(
    tenant_id: UUID,
    db: Session,
    check_active: bool = True
) -> Tenant:
    """
    Vérifie que le locataire existe et est actif.
    
    Args:
        tenant_id: ID du locataire
        db: Session de base de données
        check_active: Vérifier si le locataire est actif
        
    Returns:
        Tenant: Locataire
        
    Raises:
        HTTPException: Si le locataire n'existe pas ou est inactif
    """
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Locataire non trouvé"
        )
    
    if check_active and not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Locataire inactif"
        )
    
    return tenant


def set_tenant_context(db: Session, tenant_id: UUID):
    """
    Définit le contexte du locataire pour RLS (Row-Level Security).
    
    Args:
        db: Session de base de données
        tenant_id: ID du locataire
    """
    # Définir la variable de session PostgreSQL pour RLS
    db.execute(f"SET app.current_tenant_id = '{tenant_id}'")


def tenant_isolation_middleware(
    request: Request,
    call_next: Callable
):
    """
    Middleware pour l'isolation des locataires.
    
    Args:
        request: Requête HTTP
        call_next: Fonction suivante dans la chaîne
        
    Returns:
        Réponse HTTP
    """
    # Le tenant ID est déjà extrait par les dépendances
    # Ce middleware peut être utilisé pour des vérifications supplémentaires
    response = call_next(request)
    return response





