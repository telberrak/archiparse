"""
Points d'extrémité pour les tâches

Gère la consultation du statut des tâches.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from app.core.dependencies import get_tenant_id, get_db_session
from app.models.database import Job
from app.models.schemas import JobResponse, JobListResponse, JobStatus

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=JobListResponse)
def list_jobs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    status_filter: Optional[JobStatus] = Query(None, alias="status"),
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """
    Liste les tâches du locataire.
    
    Args:
        page: Numéro de page (commence à 1)
        page_size: Taille de la page
        status_filter: Filtrer par statut (optionnel)
        tenant_id: ID du locataire
        db: Session de base de données
        
    Returns:
        JobListResponse: Liste des tâches
    """
    query = db.query(Job).filter(Job.tenant_id == tenant_id)
    
    # Filtrer par statut si fourni
    if status_filter:
        query = query.filter(Job.status == status_filter.value)
    
    # Compter le total
    total = query.count()
    
    # Pagination
    offset = (page - 1) * page_size
    jobs = query.order_by(Job.created_at.desc()).offset(offset).limit(page_size).all()
    
    return JobListResponse(
        jobs=[JobResponse.model_validate(job) for job in jobs],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session)
):
    """
    Récupère les détails d'une tâche.
    
    Args:
        job_id: ID de la tâche
        tenant_id: ID du locataire
        db: Session de base de données
        
    Returns:
        JobResponse: Détails de la tâche
        
    Raises:
        HTTPException: Si la tâche n'existe pas ou n'appartient pas au locataire
    """
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.tenant_id == tenant_id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tâche non trouvée"
        )
    
    return JobResponse.model_validate(job)

