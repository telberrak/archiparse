"""
Points d'extrémité pour les éléments

Gère la consultation des éléments IFC, l'assignation d'un prix de catalogue,
et la correction manuelle de la quantité utilisée pour le métré chiffré.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List

from app.core.dependencies import get_tenant_id, get_db_session
from app.models.database import Element as ElementModel, PriceCatalogItem, Storey
from app.services.costing_service import (
    build_catalog_index,
    resolve_effective_price_item,
    compute_element_cost_quantity,
    ElementCostQuantity,
)

router = APIRouter(prefix="/elements", tags=["elements"])

QUANTITY_UNIT_PATTERN = "^(m²|m³|ml|u)$"


class ElementPriceAssignment(BaseModel):
    price_catalog_item_id: Optional[UUID] = None


class QuantityOverrideAssignment(BaseModel):
    value: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, pattern=QUANTITY_UNIT_PATTERN)


def _serialize_cost_quantity(cq: ElementCostQuantity) -> dict:
    return {
        "price_catalog_item_id": str(cq.price_item.id) if cq.price_item else None,
        "unit": cq.price_item.unit if cq.price_item else None,
        "resolved_quantity": cq.resolved_quantity,
        "effective_quantity": cq.effective_quantity,
        "is_override_applied": cq.is_override_applied,
        "override_ignored": cq.override_ignored,
    }


@router.get("")
def list_elements(
    model_id: UUID = Query(...),
    ifc_type: Optional[str] = Query(None),
    storey_id: Optional[UUID] = Query(None),
    space_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=5000),
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

    storey_ids = {elem.storey_id for elem in elements if elem.storey_id}
    storeys = {}
    if storey_ids:
        for storey in db.query(Storey).filter(Storey.element_id.in_(storey_ids)).all():
            storeys[storey.element_id] = storey.name

    catalog = build_catalog_index(tenant_id, db)

    element_dicts = []
    for elem in elements:
        cq = compute_element_cost_quantity(elem, catalog)
        element_dicts.append({
            "id": str(elem.id),
            "guid": str(elem.guid),
            "ifc_type": elem.ifc_type,
            "name": elem.name,
            "description": elem.description,
            "tag": elem.tag,
            "project_id": str(elem.project_id) if elem.project_id else None,
            "site_id": str(elem.site_id) if elem.site_id else None,
            "building_id": str(elem.building_id) if elem.building_id else None,
            "storey_id": str(elem.storey_id) if elem.storey_id else None,
            "storey_name": storeys.get(elem.storey_id),
            "space_id": str(elem.space_id) if elem.space_id else None,
            "properties": elem.properties,
            "quantities": elem.quantities,
            "attributes": elem.attributes,
            "geometry": elem.geometry,
            "price_catalog_item_id": str(elem.price_catalog_item_id) if elem.price_catalog_item_id else None,
            "effective_price_catalog_item_id": str(cq.price_item.id) if cq.price_item else None,
            "quantity_override_value": float(elem.quantity_override_value) if elem.quantity_override_value is not None else None,
            "quantity_override_unit": elem.quantity_override_unit,
            "cost_quantity": _serialize_cost_quantity(cq),
        })

    return {
        "elements": element_dicts,
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

    catalog = build_catalog_index(tenant_id, db)
    cq = compute_element_cost_quantity(element, catalog)

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
        "storey_name": (
            db.query(Storey.name).filter(Storey.element_id == element.storey_id).scalar()
            if element.storey_id else None
        ),
        "space_id": str(element.space_id) if element.space_id else None,
        "geometry": element.geometry,
        "price_catalog_item_id": str(element.price_catalog_item_id) if element.price_catalog_item_id else None,
        "effective_price_catalog_item_id": str(cq.price_item.id) if cq.price_item else None,
        "quantity_override_value": float(element.quantity_override_value) if element.quantity_override_value is not None else None,
        "quantity_override_unit": element.quantity_override_unit,
        "cost_quantity": _serialize_cost_quantity(cq),
    }


@router.put("/{element_id}/price")
def assign_element_price(
    element_id: UUID,
    payload: ElementPriceAssignment,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """
    Assigne (ou retire, si price_catalog_item_id est null) le prix unitaire
    d'un élément, pour l'avant-métré chiffré — voir costing_service.py.

    Args:
        element_id: ID de l'élément
        payload: entrée de catalogue à assigner (ou null pour retirer l'assignation)
        tenant_id: ID du locataire
        db: Session de base de données

    Returns:
        Élément mis à jour (mêmes champs que get_element)
    """
    element = db.query(ElementModel).filter(
        ElementModel.id == element_id,
        ElementModel.tenant_id == tenant_id
    ).first()

    if not element:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élément non trouvé")

    if payload.price_catalog_item_id is not None:
        price_item = db.query(PriceCatalogItem).filter(
            PriceCatalogItem.id == payload.price_catalog_item_id,
            PriceCatalogItem.tenant_id == tenant_id,
        ).first()
        if not price_item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prix de catalogue non trouvé")
        if price_item.ifc_type != element.ifc_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ce prix concerne « {price_item.ifc_type} », pas « {element.ifc_type} »",
            )
        element.price_catalog_item_id = price_item.id
    else:
        element.price_catalog_item_id = None

    db.commit()
    db.refresh(element)

    catalog = build_catalog_index(tenant_id, db)
    cq = compute_element_cost_quantity(element, catalog)

    return {
        "id": str(element.id),
        "price_catalog_item_id": str(element.price_catalog_item_id) if element.price_catalog_item_id else None,
        "effective_price_catalog_item_id": str(cq.price_item.id) if cq.price_item else None,
        "cost_quantity": _serialize_cost_quantity(cq),
    }


@router.put("/{element_id}/quantity-override")
def assign_element_quantity_override(
    element_id: UUID,
    payload: QuantityOverrideAssignment,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """
    Corrige manuellement la quantité utilisée pour le métré chiffré d'un
    élément (ex: mesure erronée dans le modèle source). Ne modifie jamais
    les quantités issues du parsing IFC — vient seulement les remplacer au
    moment du chiffrage, et uniquement si son unité correspond à celle du
    prix actuellement assigné (voir costing_service.py).

    Args:
        element_id: ID de l'élément
        payload: {value, unit} pour définir une correction, ou {} / valeurs
            null pour la retirer
        tenant_id: ID du locataire
        db: Session de base de données

    Returns:
        Élément mis à jour (quantité corrigée + quantité effective recalculée)
    """
    element = db.query(ElementModel).filter(
        ElementModel.id == element_id,
        ElementModel.tenant_id == tenant_id
    ).first()

    if not element:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Élément non trouvé")

    if payload.value is not None and not payload.unit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'unité est requise avec une quantité corrigée",
        )

    element.quantity_override_value = payload.value
    element.quantity_override_unit = payload.unit if payload.value is not None else None

    db.commit()
    db.refresh(element)

    catalog = build_catalog_index(tenant_id, db)
    cq = compute_element_cost_quantity(element, catalog)

    return {
        "id": str(element.id),
        "quantity_override_value": float(element.quantity_override_value) if element.quantity_override_value is not None else None,
        "quantity_override_unit": element.quantity_override_unit,
        "cost_quantity": _serialize_cost_quantity(cq),
    }
