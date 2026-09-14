"""
Points d'extrémité d'authentification

Gère l'authentification et la gestion des utilisateurs.
"""

import re
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

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
from app.services.email_service import email_service

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

RESET_TOKEN_EXPIRE_MINUTES = 60


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "cabinet"


def _unique_slug(base_slug: str, db: Session) -> str:
    slug = base_slug
    suffix = 1
    while db.query(Tenant).filter(Tenant.slug == slug).first():
        suffix += 1
        slug = f"{base_slug}-{suffix}"
    return slug


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


class PasswordChange(BaseModel):
    """Schéma pour changement de mot de passe"""
    current_password: str
    new_password: str


class SignupRequest(BaseModel):
    """Schéma pour la création d'un nouveau cabinet (locataire) + premier utilisateur"""
    tenant_name: str
    email: EmailStr
    password: str
    full_name: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


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


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(
    payload: SignupRequest,
    db: Session = Depends(get_db)
):
    """
    Crée un nouveau cabinet (locataire) avec son premier utilisateur
    (administrateur), et connecte directement cet utilisateur.

    Args:
        payload: Nom du cabinet + identifiants du premier utilisateur
        db: Session de base de données

    Returns:
        Token JWT (l'utilisateur est directement connecté)
    """
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email déjà utilisé")

    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 8 caractères",
        )

    slug = _unique_slug(_slugify(payload.tenant_name), db)
    tenant = Tenant(name=payload.tenant_name.strip(), slug=slug)
    db.add(tenant)
    db.flush()

    user = User(
        tenant_id=tenant.id,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        is_superuser=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        data={"sub": str(user.id), "tenant_id": str(user.tenant_id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


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


@router.put("/me")
def update_current_user_info(
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Met à jour le nom complet de l'utilisateur actuel.

    Args:
        payload: {"full_name": str}
        user: Utilisateur actuel
        db: Session de base de données

    Returns:
        Informations de l'utilisateur mises à jour
    """
    if "full_name" in payload:
        user.full_name = (payload["full_name"] or "").strip() or None

    db.commit()
    db.refresh(user)

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "tenant_id": str(user.tenant_id),
        "is_active": user.is_active,
        "is_superuser": user.is_superuser
    }


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordChange,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change le mot de passe de l'utilisateur actuel.

    Args:
        payload: Mot de passe actuel + nouveau mot de passe
        user: Utilisateur actuel
        db: Session de base de données

    Raises:
        HTTPException: Si le mot de passe actuel est incorrect ou le nouveau
            mot de passe est trop court
    """
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mot de passe actuel incorrect",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le nouveau mot de passe doit contenir au moins 8 caractères",
        )

    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return None


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Envoie un e-mail de réinitialisation de mot de passe si le compte existe.

    Renvoie toujours 204, que l'e-mail corresponde à un compte ou non, pour
    ne pas révéler quels e-mails sont enregistrés (énumération de comptes).

    Args:
        payload: Adresse e-mail du compte
        db: Session de base de données
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        user.reset_token = secrets.token_urlsafe(32)
        user.reset_token_expires_at = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
        db.commit()

        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={user.reset_token}"
        email_service.send_password_reset_email(user.email, reset_url)

    return None


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Réinitialise le mot de passe à partir d'un jeton reçu par e-mail.

    Args:
        payload: Jeton de réinitialisation + nouveau mot de passe
        db: Session de base de données

    Raises:
        HTTPException: Si le jeton est invalide, expiré, ou le nouveau mot
            de passe trop court
    """
    user = db.query(User).filter(User.reset_token == payload.token).first()

    # TIMESTAMPTZ revient parfois "aware" (tzinfo défini) depuis Postgres —
    # normaliser en naïf avant de comparer à datetime.utcnow().
    expires_at = user.reset_token_expires_at if user else None
    if expires_at and expires_at.tzinfo is not None:
        expires_at = expires_at.replace(tzinfo=None)

    if not user or not expires_at or expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lien de réinitialisation invalide ou expiré",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 8 caractères",
        )

    user.hashed_password = get_password_hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    db.commit()
    return None





