"""
Service de logs d'audit

Enregistre toutes les actions importantes pour traçabilité.
"""

from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional
from fastapi import Request

from app.models.database import AuditLog


class AuditService:
    """Service de logs d'audit"""
    
    def log_action(
        self,
        db: Session,
        tenant_id: UUID,
        action: str,
        resource_type: str,
        resource_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        request: Optional[Request] = None,
        details: Optional[dict] = None
    ) -> AuditLog:
        """
        Enregistre une action dans les logs d'audit.
        
        Args:
            db: Session de base de données
            tenant_id: ID du locataire
            action: Action effectuée (CREATE, READ, UPDATE, DELETE, UPLOAD, etc.)
            resource_type: Type de ressource (job, model, element, etc.)
            resource_id: ID de la ressource (optionnel)
            user_id: ID de l'utilisateur (optionnel)
            request: Requête HTTP (pour extraire IP et User-Agent)
            details: Détails supplémentaires (optionnel)
            
        Returns:
            AuditLog: Enregistrement créé
        """
        ip_address = None
        user_agent = None
        
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
        
        audit_log = AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details or {}
        )
        
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        
        return audit_log
    
    def get_audit_logs(
        self,
        db: Session,
        tenant_id: UUID,
        resource_type: Optional[str] = None,
        limit: int = 100
    ) -> list[AuditLog]:
        """
        Récupère les logs d'audit pour un locataire.
        
        Args:
            db: Session de base de données
            tenant_id: ID du locataire
            resource_type: Filtrer par type de ressource (optionnel)
            limit: Nombre maximum de logs à retourner
            
        Returns:
            Liste des logs d'audit
        """
        query = db.query(AuditLog).filter(
            AuditLog.tenant_id == tenant_id
        )
        
        if resource_type:
            query = query.filter(AuditLog.resource_type == resource_type)
        
        return query.order_by(AuditLog.created_at.desc()).limit(limit).all()


# Instance globale du service
audit_service = AuditService()

