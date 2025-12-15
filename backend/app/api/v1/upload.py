"""
Points d'extrémité d'upload de fichiers

Gère l'upload de fichiers IFCXML.
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.dependencies import get_verified_tenant, get_db_session
from app.models.database import Tenant
from app.services.upload_service import upload_service
from app.services.quota_service import quota_service
from app.services.audit_service import audit_service
from app.models.schemas import UploadResponse, JobResponse
from app.core.config import settings
from app.workers.processing_worker import process_job
from fastapi import Request

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    background_tasks: BackgroundTasks,
    request: Request,
    file: UploadFile = File(...),
    tenant: Tenant = Depends(get_verified_tenant),
    db: Session = Depends(get_db_session)
):
    """
    Upload un fichier IFCXML.
    
    Le fichier est sauvegardé et une tâche de traitement est créée.
    Le traitement (validation, parsing) se fait en arrière-plan.
    
    Args:
        file: Fichier uploadé
        tenant_id: ID du locataire (depuis les en-têtes)
        db: Session de base de données
        
    Returns:
        UploadResponse: Informations sur la tâche créée
        
    Raises:
        HTTPException: Si le fichier est invalide ou trop volumineux
    """
    # Vérifier la taille du fichier
    if file.size and file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Fichier trop volumineux. Maximum: {settings.MAX_FILE_SIZE / (1024*1024):.0f}MB"
        )
    
    # Lire le contenu du fichier
    try:
        content = await file.read()
        file_size = len(content)
        
        # Vérifier les quotas
        is_valid, error_msg = quota_service.check_file_size_quota(tenant, file_size)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=error_msg
            )
        
        is_valid, error_msg = quota_service.check_storage_quota(tenant, db, file_size)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=error_msg
            )
        
        is_valid, error_msg = quota_service.check_files_per_month_quota(tenant, db)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=error_msg
            )
        
        # Sauvegarder le fichier
        saved_path = upload_service.save_uploaded_file(
            file_content=content,
            filename=file.filename or "upload.ifcxml",
            tenant_id=tenant.id
        )
        
        # Créer la tâche
        job = upload_service.create_job(
            db=db,
            tenant_id=tenant.id,
            filename=file.filename or "upload.ifcxml",
            file_size=file_size,
            file_path=saved_path
        )
        
        # Logger l'action
        audit_service.log_action(
            db=db,
            tenant_id=tenant.id,
            action="UPLOAD",
            resource_type="job",
            resource_id=job.id,
            request=request,
            details={"filename": file.filename, "file_size": file_size}
        )
        
        # Démarrer le traitement en arrière-plan
        # En production, utiliser Celery. Pour l'instant, on utilise BackgroundTasks
        background_tasks.add_task(process_job, job.id)
        
        return UploadResponse(
            job_id=job.id,
            filename=job.filename,
            file_size=job.file_size,
            status=job.status,
            message="Fichier uploadé avec succès. Traitement en cours."
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'upload: {str(e)}"
        )
