"""
Middleware d'authentification

Gère l'authentification JWT et l'extraction du tenant ID.
"""

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.database import User, Tenant
from app.core.config import settings

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dépendance pour obtenir l'utilisateur actuel depuis le token JWT.
    
    Args:
        credentials: Credentials HTTP depuis l'en-tête Authorization
        db: Session de base de données
        
    Returns:
        User: Utilisateur actuel
        
    Raises:
        HTTPException: Si le token est invalide ou l'utilisateur n'existe pas
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non trouvé ou inactif",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def get_current_tenant(
    user: User = Depends(get_current_user)
) -> Tenant:
    """
    Dépendance pour obtenir le locataire de l'utilisateur actuel.
    
    Args:
        user: Utilisateur actuel
        
    Returns:
        Tenant: Locataire de l'utilisateur
    """
    return user.tenant


def get_tenant_id_optional(
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID"),
    authorization: Optional[str] = Header(None)
) -> Optional[UUID]:
    """
    Obtient le tenant ID depuis les en-têtes ou le token JWT.
    Pour compatibilité avec le développement et l'API key auth.
    
    Args:
        x_tenant_id: ID du locataire depuis l'en-tête
        authorization: Token d'authentification
        
    Returns:
        UUID du locataire ou None
    """
    # Si un token JWT est fourni, l'utiliser
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        payload = decode_access_token(token)
        if payload:
            # Le tenant_id est dans le payload du token
            tenant_id_str = payload.get("tenant_id")
            if tenant_id_str:
                try:
                    return UUID(tenant_id_str)
                except ValueError:
                    pass
            # Sinon, récupérer depuis l'utilisateur
            user_id = payload.get("sub")
            if user_id:
                from app.core.database import SessionLocal
                db = SessionLocal()
                try:
                    user = db.query(User).filter(User.id == UUID(user_id)).first()
                    if user:
                        return user.tenant_id
                finally:
                    db.close()
    
    # Utiliser l'en-tête X-Tenant-ID si fourni
    if x_tenant_id:
        try:
            return UUID(x_tenant_id)
        except ValueError:
            return None
    
    # Pour le développement, utiliser le tenant par défaut
    if settings.DEFAULT_TENANT_ID:
        try:
            return UUID(settings.DEFAULT_TENANT_ID)
        except ValueError:
            pass
    
    return None


def get_tenant_id(
    tenant_id: Optional[UUID] = Depends(get_tenant_id_optional)
) -> UUID:
    """
    Dépendance pour obtenir le tenant ID (requis).
    
    Args:
        tenant_id: Tenant ID optionnel
        
    Returns:
        UUID du locataire
        
    Raises:
        HTTPException: Si aucun tenant ID n'est fourni
    """
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant ID requis. Fournissez un token JWT ou un en-tête X-Tenant-ID"
        )
    return tenant_id

