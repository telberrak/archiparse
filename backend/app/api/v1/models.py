"""
Points d'extrémité pour les modèles

Gère la consultation des modèles parsés.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from app.core.dependencies import get_tenant_id, get_db_session
from app.models.database import Model
from app.models.schemas import ModelResponse

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=list[ModelResponse])
def list_models(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """
    Liste les modèles du locataire.
    
    Args:
        page: Numéro de page
        page_size: Taille de la page
        tenant_id: ID du locataire
        db: Session de base de données
        
    Returns:
        Liste des modèles
    """
    query = db.query(Model).filter(Model.tenant_id == tenant_id)
    
    offset = (page - 1) * page_size
    models = query.order_by(Model.created_at.desc()).offset(offset).limit(page_size).all()
    
    return [ModelResponse.model_validate(model) for model in models]


@router.get("/{model_id}", response_model=ModelResponse)
def get_model(
    model_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """
    Récupère les détails d'un modèle.
    
    Args:
        model_id: ID du modèle
        tenant_id: ID du locataire
        db: Session de base de données
        
    Returns:
        Détails du modèle
        
    Raises:
        HTTPException: Si le modèle n'existe pas
    """
    model = db.query(Model).filter(
        Model.id == model_id,
        Model.tenant_id == tenant_id
    ).first()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modèle non trouvé"
        )
    
    return ModelResponse.model_validate(model)





