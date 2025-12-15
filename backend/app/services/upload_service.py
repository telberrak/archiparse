"""
Service d'upload de fichiers

Gère l'upload et le stockage des fichiers IFCXML.
"""

from pathlib import Path
from uuid import UUID
from typing import Optional
import shutil
from datetime import datetime

from app.core.config import settings
from app.models.database import Job, Tenant
from app.models.schemas import JobStatus
from sqlalchemy.orm import Session


class UploadService:
    """Service d'upload de fichiers"""
    
    def __init__(self):
        """Initialise le service"""
        self.upload_dir = settings.UPLOAD_DIR
        self.max_file_size = settings.MAX_FILE_SIZE
    
    def save_uploaded_file(
        self,
        file_content: bytes,
        filename: str,
        tenant_id: UUID
    ) -> Path:
        """
        Sauvegarde un fichier uploadé.
        
        Args:
            file_content: Contenu du fichier
            filename: Nom du fichier
            tenant_id: ID du locataire
            
        Returns:
            Path: Chemin vers le fichier sauvegardé
            
        Raises:
            ValueError: Si le fichier est trop volumineux ou extension invalide
        """
        # Vérifier la taille
        if len(file_content) > self.max_file_size:
            raise ValueError(
                f"Fichier trop volumineux. Maximum: {self.max_file_size / (1024*1024):.0f}MB"
            )
        
        # Vérifier l'extension
        file_path = Path(filename)
        if file_path.suffix.lower() not in settings.ALLOWED_EXTENSIONS:
            raise ValueError(
                f"Extension de fichier non autorisée. Autorisées: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )
        
        # Créer le répertoire du locataire
        tenant_dir = self.upload_dir / str(tenant_id)
        tenant_dir.mkdir(parents=True, exist_ok=True)
        
        # Générer un nom de fichier unique
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{file_path.name}"
        file_path = tenant_dir / safe_filename
        
        # Sauvegarder le fichier
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        return file_path
    
    def create_job(
        self,
        db: Session,
        tenant_id: UUID,
        filename: str,
        file_size: int,
        file_path: Path
    ) -> Job:
        """
        Crée un enregistrement de tâche dans la base de données.
        
        Args:
            db: Session de base de données
            tenant_id: ID du locataire
            filename: Nom du fichier
            file_size: Taille du fichier en octets
            file_path: Chemin vers le fichier sauvegardé
            
        Returns:
            Job: Enregistrement de tâche créé
        """
        job = Job(
            tenant_id=tenant_id,
            filename=filename,
            file_size=file_size,
            file_path=str(file_path),
            status=JobStatus.EN_ATTENTE
        )
        
        db.add(job)
        db.commit()
        db.refresh(job)
        
        return job
    
    def delete_file(self, file_path: Path):
        """
        Supprime un fichier du stockage.
        
        Args:
            file_path: Chemin vers le fichier à supprimer
        """
        if file_path.exists():
            file_path.unlink()


# Instance globale du service
upload_service = UploadService()





