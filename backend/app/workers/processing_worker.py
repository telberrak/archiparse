"""
Worker de traitement en arrière-plan

Traite les tâches d'upload: validation, parsing (avec résolution des Psets/Qtos).
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
from app.services.quality_service import quality_service
from app.services.compliance_service import compliance_service


def process_job(job_id: UUID):
    """
    Traite une tâche complète: validation, parsing (résolution Psets/Qtos), contrôle qualité.

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
            project_id=job.project_id,
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
            new_statistics = {
                "elements": stats["elements"],
                "spaces": stats["spaces"],
                "storeys": stats["storeys"],
                "relationships": stats["relationships"],
                "ifc_version": job.ifc_version,
                "project_name": stats.get("project_name"),
            }

            if stats.get("project_guid"):
                model.project_guid = stats["project_guid"]

            # Étape 2bis: Contrôle qualité (règles déterministes, pas d'IA)
            print(f"Contrôle qualité du modèle {model.id}...")
            try:
                quality_result = quality_service.check_model(model.id, job.tenant_id, db)
                new_statistics["quality_warnings"] = quality_result["warnings"]
                new_statistics["quality_summary"] = quality_result["summary"]
            except Exception as e:
                print(f"Erreur lors du contrôle qualité (non bloquant): {str(e)}")
                new_statistics["quality_warnings"] = []
                new_statistics["quality_summary"] = {"error": str(e)}

            # Étape 2ter: Contrôles réglementaires indicatifs (règles déterministes)
            print(f"Contrôle réglementaire indicatif du modèle {model.id}...")
            try:
                compliance_result = compliance_service.check_model(model.id, job.tenant_id, db)
                new_statistics["compliance_warnings"] = compliance_result["warnings"]
                new_statistics["compliance_summary"] = compliance_result["summary"]
            except Exception as e:
                print(f"Erreur lors du contrôle réglementaire (non bloquant): {str(e)}")
                new_statistics["compliance_warnings"] = []
                new_statistics["compliance_summary"] = {"error": str(e)}

            model.statistics = new_statistics
            db.commit()
            
        except Exception as e:
            job.status = JobStatus.ECHOUE
            job.error_message = f"Erreur lors du parsing: {str(e)}"
            db.commit()
            raise
        
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

