"""
Points d'extrémité d'authentification

Gère l'authentification et la gestion des utilisateurs.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import timedelta

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.models.database import User, Tenant
from app.middleware.auth_middleware import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


class UserCreate(BaseModel):
    """Schéma pour création d'utilisateur"""
    email: EmailStr
    password: str
    full_name: str | None = None
    tenant_id: str  # UUID du locataire


class UserLogin(BaseModel):
    """Schéma pour connexion"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Réponse avec token"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Enregistre un nouvel utilisateur.
    
    Args:
        user_data: Données de l'utilisateur
        db: Session de base de données
        
    Returns:
        Message de succès
    """
    # Vérifier que le locataire existe
    tenant = db.query(Tenant).filter(Tenant.id == user_data.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Locataire non trouvé"
        )
    
    # Vérifier que l'email n'existe pas déjà
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email déjà utilisé"
        )
    
    # Créer l'utilisateur
    user = User(
        tenant_id=user_data.tenant_id,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {"message": "Utilisateur créé avec succès", "user_id": str(user.id)}


@router.post("/login", response_model=TokenResponse)
def login(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Connecte un utilisateur et retourne un token JWT.
    
    Args:
        credentials: Identifiants de connexion
        db: Session de base de données
        
    Returns:
        Token JWT
    """
    user = db.query(User).filter(User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte utilisateur inactif"
        )
    
    # Mettre à jour la dernière connexion
    from datetime import datetime
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Créer le token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "tenant_id": str(user.tenant_id)},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


@router.get("/me")
def get_current_user_info(
    user: User = Depends(get_current_user)
):
    """
    Retourne les informations de l'utilisateur actuel.
    
    Args:
        user: Utilisateur actuel
        
    Returns:
        Informations de l'utilisateur
    """
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "tenant_id": str(user.tenant_id),
        "is_active": user.is_active,
        "is_superuser": user.is_superuser
    }





