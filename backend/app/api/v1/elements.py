"""
Points d'extrémité pour les éléments

Gère la consultation des éléments IFC.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List

from app.core.dependencies import get_tenant_id, get_db_session
from app.models.database import Element as ElementModel

router = APIRouter(prefix="/elements", tags=["elements"])


@router.get("")
def list_elements(
    model_id: UUID = Query(...),
    ifc_type: Optional[str] = Query(None),
    storey_id: Optional[UUID] = Query(None),
    space_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """
    Liste les éléments d'un modèle.
    
    Args:
        model_id: ID du modèle
        ifc_type: Filtrer par type IFC (optionnel)
        storey_id: Filtrer par niveau (optionnel)
        space_id: Filtrer par espace (optionnel)
        page: Numéro de page
        page_size: Taille de la page
        tenant_id: ID du locataire
        db: Session de base de données
        
    Returns:
        Liste des éléments
    """
    query = db.query(ElementModel).filter(
        ElementModel.model_id == model_id,
        ElementModel.tenant_id == tenant_id
    )
    
    if ifc_type:
        query = query.filter(ElementModel.ifc_type == ifc_type)
    
    if storey_id:
        query = query.filter(ElementModel.storey_id == storey_id)
    
    if space_id:
        query = query.filter(ElementModel.space_id == space_id)
    
    offset = (page - 1) * page_size
    elements = query.order_by(ElementModel.ifc_type, ElementModel.name).offset(offset).limit(page_size).all()
    
    return {
        "elements": [
            {
                "id": str(elem.id),
                "guid": str(elem.guid),
                "ifc_type": elem.ifc_type,
                "name": elem.name,
                "description": elem.description,
                "tag": elem.tag,
                "storey_id": str(elem.storey_id) if elem.storey_id else None,
                "space_id": str(elem.space_id) if elem.space_id else None
            }
            for elem in elements
        ],
        "total": query.count(),
        "page": page,
        "page_size": page_size
    }


@router.get("/{element_id}")
def get_element(
    element_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """
    Récupère les détails d'un élément.
    
    Args:
        element_id: ID de l'élément
        tenant_id: ID du locataire
        db: Session de base de données
        
    Returns:
        Détails de l'élément
    """
    element = db.query(ElementModel).filter(
        ElementModel.id == element_id,
        ElementModel.tenant_id == tenant_id
    ).first()
    
    if not element:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Élément non trouvé"
        )
    
    return {
        "id": str(element.id),
        "guid": str(element.guid),
        "ifc_type": element.ifc_type,
        "name": element.name,
        "description": element.description,
        "tag": element.tag,
        "properties": element.properties,
        "quantities": element.quantities,
        "attributes": element.attributes,
        "storey_id": str(element.storey_id) if element.storey_id else None,
        "space_id": str(element.space_id) if element.space_id else None
    }





