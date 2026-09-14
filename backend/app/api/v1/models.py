"""
Points d'extrémité pour les modèles

Gère la consultation des modèles parsés.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from typing import Optional
from datetime import datetime
import re

from app.core.dependencies import get_tenant_id, get_db_session
from app.models.database import Model, Project, Storey
from app.models.schemas import ModelResponse
from app.services.report_service import report_service
from app.services.costing_service import costing_service

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=list[ModelResponse])
def list_models(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    project_id: Optional[UUID] = Query(None),
    status_filter: str = Query("active", alias="status", pattern="^(active|deleted)$"),
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """
    Liste les modèles du locataire (actifs par défaut, ou archivés avec
    ?status=deleted), optionnellement filtrés par projet.

    Args:
        page: Numéro de page
        page_size: Taille de la page
        project_id: Filtre optionnel sur le projet
        tenant_id: ID du locataire
        db: Session de base de données

    Returns:
        Liste des modèles
    """
    query = (
        db.query(Model)
        .options(joinedload(Model.project).joinedload(Project.client))
        .filter(Model.tenant_id == tenant_id, Model.status == status_filter)
    )
    if project_id:
        query = query.filter(Model.project_id == project_id)

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
    model = (
        db.query(Model)
        .options(joinedload(Model.project).joinedload(Project.client))
        .filter(Model.id == model_id, Model.tenant_id == tenant_id, Model.status == "active")
        .first()
    )

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modèle non trouvé"
        )

    return ModelResponse.model_validate(model)


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model(
    model_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """Supprime (en douceur) un modèle importé — marqué status='deleted',
    rien n'est retiré de la base ni du stockage. Retrouvable et restaurable
    depuis /archives (voir restore_model ci-dessous)."""
    model = db.query(Model).filter(
        Model.id == model_id, Model.tenant_id == tenant_id, Model.status == "active"
    ).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modèle non trouvé")

    model.status = "deleted"
    db.commit()
    return None


@router.post("/{model_id}/restore", response_model=ModelResponse)
def restore_model(
    model_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """Restaure un modèle archivé (voir /archives). Si son projet (ou le
    client de son projet) avait lui aussi été archivé, ils sont restaurés
    avec lui pour qu'un modèle actif ait toujours un projet/client actif —
    sans toucher aux autres modèles de ce projet qui restent archivés."""
    model = (
        db.query(Model)
        .options(joinedload(Model.project).joinedload(Project.client))
        .filter(Model.id == model_id, Model.tenant_id == tenant_id, Model.status == "deleted")
        .first()
    )
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modèle archivé non trouvé")

    if model.project and model.project.status == "deleted":
        model.project.status = "active"
        if model.project.client and model.project.client.status == "deleted":
            model.project.client.status = "active"

    model.status = "active"
    db.commit()
    db.refresh(model)
    return ModelResponse.model_validate(model)


@router.get("/{model_id}/storeys")
def list_storeys(
    model_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """Liste les étages d'un modèle."""
    model = db.query(Model).filter(
        Model.id == model_id,
        Model.tenant_id == tenant_id,
        Model.status == "active"
    ).first()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modèle non trouvé"
        )

    storeys = db.query(Storey).filter(
        Storey.model_id == model_id,
        Storey.tenant_id == tenant_id
    ).order_by(Storey.elevation.nullslast(), Storey.name).all()

    return [
        {
            "id": str(storey.element_id),
            "guid": str(storey.guid),
            "name": storey.name,
            "elevation": float(storey.elevation) if storey.elevation is not None else None,
        }
        for storey in storeys
    ]


@router.get("/{model_id}/report")
def download_report(
    model_id: UUID,
    format: str = Query("xlsx", pattern="^(xlsx|pdf|dpgf)$"),
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """
    Génère et télécharge un rapport de quantités pour un modèle.

    Args:
        model_id: ID du modèle
        format: 'xlsx' (Excel), 'pdf', ou 'dpgf' (Excel, avant-métré chiffré)
        tenant_id: ID du locataire
        db: Session de base de données

    Returns:
        Fichier binaire (Excel ou PDF) en téléchargement
    """
    model = db.query(Model).filter(
        Model.id == model_id,
        Model.tenant_id == tenant_id,
        Model.status == "active"
    ).first()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modèle non trouvé"
        )

    base_name = re.sub(r"[^A-Za-z0-9_-]+", "_", model.name or "modele").strip("_") or "modele"
    timestamp = datetime.utcnow().strftime("%Y%m%d")

    try:
        if format == "xlsx":
            content = report_service.generate_excel(model_id, tenant_id, db)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"{base_name}_{timestamp}.xlsx"
        elif format == "dpgf":
            content = report_service.generate_dpgf(model_id, tenant_id, db)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"{base_name}_dpgf_{timestamp}.xlsx"
        else:
            content = report_service.generate_pdf(model_id, tenant_id, db)
            media_type = "application/pdf"
            filename = f"{base_name}_{timestamp}.pdf"
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{model_id}/cost-estimate")
def get_cost_estimate(
    model_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """
    Calcule l'avant-métré chiffré d'un modèle à partir du catalogue de prix
    unitaires du locataire (voir price_catalog.py / costing_service.py).

    Args:
        model_id: ID du modèle
        tenant_id: ID du locataire
        db: Session de base de données

    Returns:
        Lignes de métré chiffrées + types non chiffrés (sans prix renseigné) + total
    """
    model = db.query(Model).filter(
        Model.id == model_id,
        Model.tenant_id == tenant_id,
        Model.status == "active"
    ).first()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modèle non trouvé"
        )

    return costing_service.estimate_model(model_id, tenant_id, db)


@router.get("/{model_id}/quality")
def get_quality_report(
    model_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """
    Retourne les avertissements de qualité d'export (quantités manquantes)
    calculés lors du traitement du modèle.

    Args:
        model_id: ID du modèle
        tenant_id: ID du locataire
        db: Session de base de données

    Returns:
        Liste structurée des avertissements + résumé
    """
    model = db.query(Model).filter(
        Model.id == model_id,
        Model.tenant_id == tenant_id,
        Model.status == "active"
    ).first()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modèle non trouvé"
        )

    stats = model.statistics or {}
    return {
        "warnings": stats.get("quality_warnings", []),
        "summary": stats.get("quality_summary", {
            "elements_checked": 0,
            "elements_with_warnings": 0,
            "warnings_by_type": {},
        }),
    }


@router.get("/{model_id}/compliance")
def get_compliance_report(
    model_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """
    Retourne les avertissements réglementaires indicatifs (« à vérifier »)
    calculés lors du traitement du modèle. Ce ne sont pas des contrôles de
    conformité certifiés — voir compliance_service.py.

    Args:
        model_id: ID du modèle
        tenant_id: ID du locataire
        db: Session de base de données

    Returns:
        Liste structurée des avertissements + résumé
    """
    model = db.query(Model).filter(
        Model.id == model_id,
        Model.tenant_id == tenant_id,
        Model.status == "active"
    ).first()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modèle non trouvé"
        )

    stats = model.statistics or {}
    return {
        "warnings": stats.get("compliance_warnings", []),
        "summary": stats.get("compliance_summary", {
            "elements_checked": 0,
            "warnings_count": 0,
            "warnings_by_rule": {},
        }),
    }





