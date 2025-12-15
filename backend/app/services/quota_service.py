"""
Service de gestion des quotas

Vérifie et applique les limites par locataire.
"""

from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session
from uuid import UUID
from pathlib import Path

from app.models.database import Tenant, Job
from app.core.config import settings


class QuotaService:
    """Service de gestion des quotas"""
    
    def check_file_size_quota(
        self,
        tenant: Tenant,
        file_size: int
    ) -> tuple[bool, str]:
        """
        Vérifie si la taille du fichier respecte les limites du locataire.
        
        Args:
            tenant: Locataire
            file_size: Taille du fichier en octets
            
        Returns:
            Tuple (is_valid, error_message)
        """
        if file_size > tenant.max_file_size:
            max_mb = tenant.max_file_size / (1024 * 1024)
            return False, f"Fichier trop volumineux. Maximum autorisé: {max_mb:.0f}MB"
        
        return True, ""
    
    def check_storage_quota(
        self,
        tenant: Tenant,
        db: Session,
        additional_size: int = 0
    ) -> tuple[bool, str]:
        """
        Vérifie si le locataire a assez d'espace de stockage.
        
        Args:
            tenant: Locataire
            db: Session de base de données
            additional_size: Taille supplémentaire à ajouter (en octets)
            
        Returns:
            Tuple (is_valid, error_message)
        """
        # Calculer l'espace utilisé actuel
        total_size = db.query(func.sum(Job.file_size)).filter(
            Job.tenant_id == tenant.id
        ).scalar() or 0
        
        if total_size + additional_size > tenant.max_storage_size:
            max_gb = tenant.max_storage_size / (1024 * 1024 * 1024)
            used_gb = total_size / (1024 * 1024 * 1024)
            return False, f"Quota de stockage dépassé. Maximum: {max_gb:.1f}GB, Utilisé: {used_gb:.1f}GB"
        
        return True, ""
    
    def check_files_per_month_quota(
        self,
        tenant: Tenant,
        db: Session
    ) -> tuple[bool, str]:
        """
        Vérifie si le locataire n'a pas dépassé la limite de fichiers par mois.
        
        Args:
            tenant: Locataire
            db: Session de base de données
            
        Returns:
            Tuple (is_valid, error_message)
        """
        # Compter les fichiers uploadés ce mois
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        files_this_month = db.query(func.count(Job.id)).filter(
            Job.tenant_id == tenant.id,
            Job.created_at >= start_of_month
        ).scalar() or 0
        
        if files_this_month >= tenant.max_files_per_month:
            return False, f"Limite de fichiers mensuels atteinte. Maximum: {tenant.max_files_per_month} fichiers/mois"
        
        return True, ""
    
    def get_quota_usage(
        self,
        tenant: Tenant,
        db: Session
    ) -> dict:
        """
        Obtient l'utilisation des quotas du locataire.
        
        Args:
            tenant: Locataire
            db: Session de base de données
            
        Returns:
            Dictionnaire avec les informations d'utilisation
        """
        # Espace utilisé
        total_size = db.query(func.sum(Job.file_size)).filter(
            Job.tenant_id == tenant.id
        ).scalar() or 0
        
        # Fichiers ce mois
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        files_this_month = db.query(func.count(Job.id)).filter(
            Job.tenant_id == tenant.id,
            Job.created_at >= start_of_month
        ).scalar() or 0
        
        return {
            "storage": {
                "used": total_size,
                "max": tenant.max_storage_size,
                "used_percent": (total_size / tenant.max_storage_size * 100) if tenant.max_storage_size > 0 else 0
            },
            "files_per_month": {
                "used": files_this_month,
                "max": tenant.max_files_per_month,
                "used_percent": (files_this_month / tenant.max_files_per_month * 100) if tenant.max_files_per_month > 0 else 0
            },
            "max_file_size": tenant.max_file_size
        }


# Instance globale du service
quota_service = QuotaService()





