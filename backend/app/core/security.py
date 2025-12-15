"""
Utilitaires de sécurité

Gestion de l'authentification JWT et des tokens.
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt

from app.core.config import settings

# Clé secrète pour JWT (en production, utiliser une variable d'environnement)
SECRET_KEY = getattr(settings, 'SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Vérifie un mot de passe en clair contre un hash.
    
    Args:
        plain_password: Mot de passe en clair
        hashed_password: Hash du mot de passe
        
    Returns:
        True si le mot de passe correspond
    """
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """
    Hash un mot de passe.
    
    Args:
        password: Mot de passe en clair
        
    Returns:
        Hash du mot de passe
    """
    # Bcrypt limite à 72 bytes, tronquer si nécessaire
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crée un token JWT d'accès.
    
    Args:
        data: Données à encoder dans le token
        expires_delta: Délai d'expiration (optionnel)
        
    Returns:
        Token JWT encodé
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Décode un token JWT.
    
    Args:
        token: Token JWT à décoder
        
    Returns:
        Données décodées ou None si invalide
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

