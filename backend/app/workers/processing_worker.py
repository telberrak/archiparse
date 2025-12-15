"""
Worker de traitement en arrière-plan

Traite les tâches d'upload: validation, parsing, transformation.
"""

from pathlib import Path
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.database import Job, Model, Tenant
from app.models.schemas import JobStatus
from app.services.validation_service import validation_service
from app.services.parser_service import parser_service
from app.services.xslt_service import xslt_service


def process_job(job_id: UUID):
    """
    Traite une tâche complète: validation, parsing, transformation.
    
    Args:
        job_id: ID de la tâche à traiter
    """
    db = SessionLocal()
    
    try:
        # Récupérer la tâche
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            print(f"Tâche {job_id} non trouvée")
            return
        
        # Vérifier que la tâche est en attente
        if job.status != JobStatus.EN_ATTENTE:
            print(f"Tâche {job_id} déjà traitée ou en cours")
            return
        
        # Mettre à jour le statut
        job.status = JobStatus.VALIDATION
        job.started_at = datetime.utcnow()
        db.commit()
        
        # Étape 1: Validation XSD
        print(f"Validation du fichier {job.filename}...")
        file_path = Path(job.file_path)
        
        if not file_path.exists():
            job.status = JobStatus.ECHOUE
            job.error_message = "Fichier non trouvé"
            db.commit()
            return
        
        validation_result = validation_service.validate_file(file_path)
        
        if not validation_result.is_valid:
            job.status = JobStatus.ECHOUE
            job.error_message = f"Validation échouée: {len(validation_result.errors)} erreur(s)"
            job.validation_errors = [
                {
                    "line": err.line,
                    "column": err.column,
                    "message": err.message
                }
                for err in validation_result.errors
            ]
            job.ifc_version = validation_result.ifc_version.value if validation_result.ifc_version else None
            db.commit()
            return
        
        # Mettre à jour avec la version détectée
        if validation_result.ifc_version:
            job.ifc_version = validation_result.ifc_version.value
        
        job.status = JobStatus.VALIDE
        db.commit()
        
        # Étape 2: Parsing
        print(f"Parsing du fichier {job.filename}...")
        job.status = JobStatus.PARSING
        db.commit()
        
        # Créer le modèle
        model = Model(
            job_id=job.id,
            tenant_id=job.tenant_id,
            name=job.filename,
            statistics={}
        )
        db.add(model)
        db.flush()
        
        # Parser le fichier
        try:
            stats = parser_service.parse_file(
                xml_file_path=file_path,
                model_id=model.id,
                tenant_id=job.tenant_id,
                db=db
            )
            
            # Mettre à jour les statistiques
            model.statistics = {
                "elements": stats["elements"],
                "spaces": stats["spaces"],
                "storeys": stats["storeys"],
                "relationships": stats["relationships"]
            }
            
            if stats.get("project_guid"):
                model.project_guid = stats["project_guid"]
            
            db.commit()
            
        except Exception as e:
            job.status = JobStatus.ECHOUE
            job.error_message = f"Erreur lors du parsing: {str(e)}"
            db.commit()
            raise
        
        # Étape 3: Transformation XSLT
        print(f"Transformation XSLT du fichier {job.filename}...")
        job.status = JobStatus.TRANSFORMATION
        db.commit()
        
        if xslt_service:
            try:
                # Transformer en JSON normalisé
                normalized_json = xslt_service.transform_to_json(
                    xml_file_path=file_path,
                    ifc_version=job.ifc_version
                )
                
                # Stocker le JSON dans le modèle
                model.normalized_json = normalized_json
                db.commit()
                
            except Exception as e:
                # Si la transformation échoue, on continue quand même
                # Le modèle est déjà parsé et stocké
                print(f"Erreur lors de la transformation XSLT (non bloquant): {str(e)}")
                # On peut stocker une erreur dans les métadonnées
                # Note: model n'a pas de champ metadata, utiliser statistics à la place
                if not model.statistics:
                    model.statistics = {}
                model.statistics["xslt_error"] = str(e)
                db.commit()
        else:
            print("Service XSLT non disponible, transformation ignorée")
        
        # Terminé
        print(f"Traitement terminé pour {job.filename}")
        job.status = JobStatus.TERMINE
        job.completed_at = datetime.utcnow()
        db.commit()
        
    except Exception as e:
        print(f"Erreur lors du traitement de la tâche {job_id}: {str(e)}")
        if job:
            job.status = JobStatus.ECHOUE
            job.error_message = str(e)
            db.commit()
    finally:
        db.close()


# Pour utilisation avec Celery (Phase 4)
# @celery_app.task
# def process_job_async(job_id: str):
#     process_job(UUID(job_id))

