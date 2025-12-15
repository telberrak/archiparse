"""
Modèles de base de données SQLAlchemy

Correspond au schéma défini dans DATABASE_SCHEMA.md
"""

from sqlalchemy import Column, String, Text, BigInteger, Boolean, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from uuid import uuid4

from app.core.database import Base


class Tenant(Base):
    """Table des locataires"""
    
    __tablename__ = "tenants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    
    # Limites et quotas
    max_file_size = Column(BigInteger, default=500 * 1024 * 1024)  # 500MB par défaut
    max_files_per_month = Column(BigInteger, default=100)  # 100 fichiers par mois
    max_storage_size = Column(BigInteger, default=10 * 1024 * 1024 * 1024)  # 10GB par défaut


class User(Base):
    """Table des utilisateurs"""
    
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())
    last_login = Column(TIMESTAMP(timezone=True))
    
    # Relations
    tenant = relationship("Tenant", backref="users")


class AuditLog(Base):
    """Table des logs d'audit"""
    
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)  # CREATE, READ, UPDATE, DELETE, UPLOAD, etc.
    resource_type = Column(String(100), nullable=False)  # job, model, element, etc.
    resource_id = Column(UUID(as_uuid=True), nullable=True)
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    details = Column(JSONB)  # Détails supplémentaires
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class Job(Base):
    """Table des tâches de traitement"""
    
    __tablename__ = "jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(500), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_path = Column(String(1000), nullable=False)
    ifc_version = Column(String(10), nullable=True)  # 'IFC2X3' ou 'IFC4'
    status = Column(String(20), nullable=False, default="EN_ATTENTE")
    # Statuts: EN_ATTENTE, VALIDATION, VALIDE, PARSING, TRANSFORMATION, TERMINE, ECHOUE
    error_message = Column(Text)
    validation_errors = Column(JSONB)
    job_metadata = Column(JSONB)  # Renommé pour éviter conflit avec SQLAlchemy.metadata
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())
    started_at = Column(TIMESTAMP(timezone=True))
    completed_at = Column(TIMESTAMP(timezone=True))
    
    # Relations
    tenant = relationship("Tenant", backref="jobs")
    model = relationship("Model", backref="job", uselist=False)


class Model(Base):
    """Table des modèles IFC parsés"""
    
    __tablename__ = "models"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(500))
    description = Column(Text)
    project_guid = Column(UUID(as_uuid=True))
    normalized_json = Column(JSONB)
    statistics = Column(JSONB)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())


class Element(Base):
    """Table des éléments IFC"""
    
    __tablename__ = "elements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    model_id = Column(UUID(as_uuid=True), ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    guid = Column(UUID(as_uuid=True), nullable=False)
    ifc_type = Column(String(100), nullable=False)
    name = Column(String(500))
    description = Column(Text)
    tag = Column(String(100))
    # Hiérarchie
    project_id = Column(UUID(as_uuid=True), ForeignKey("elements.id"))
    site_id = Column(UUID(as_uuid=True), ForeignKey("elements.id"))
    building_id = Column(UUID(as_uuid=True), ForeignKey("elements.id"))
    storey_id = Column(UUID(as_uuid=True), ForeignKey("elements.id"))
    space_id = Column(UUID(as_uuid=True), ForeignKey("elements.id"))
    # Propriétés
    properties = Column(JSONB)
    quantities = Column(JSONB)
    geometry = Column(JSONB)
    attributes = Column(JSONB)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint("model_id", "guid", name="uq_elements_model_guid"),
    )


class Relationship(Base):
    """Table des relations entre éléments"""
    
    __tablename__ = "relationships"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    model_id = Column(UUID(as_uuid=True), ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    relationship_type = Column(String(50), nullable=False)
    from_element_id = Column(UUID(as_uuid=True), ForeignKey("elements.id", ondelete="CASCADE"), nullable=False)
    to_element_id = Column(UUID(as_uuid=True), ForeignKey("elements.id", ondelete="CASCADE"), nullable=False)
    relationship_metadata = Column(JSONB)  # Renommé pour éviter conflit avec SQLAlchemy.metadata
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class Space(Base):
    """Table des espaces (pièces)"""
    
    __tablename__ = "spaces"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    element_id = Column(UUID(as_uuid=True), ForeignKey("elements.id", ondelete="CASCADE"), nullable=False)
    model_id = Column(UUID(as_uuid=True), ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    guid = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(500))
    number = Column(String(100))
    storey_id = Column(UUID(as_uuid=True), ForeignKey("elements.id"))
    building_id = Column(UUID(as_uuid=True), ForeignKey("elements.id"))
    properties = Column(JSONB)
    quantities = Column(JSONB)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint("model_id", "guid", name="uq_spaces_model_guid"),
    )


class Storey(Base):
    """Table des niveaux (étages)"""
    
    __tablename__ = "storeys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    element_id = Column(UUID(as_uuid=True), ForeignKey("elements.id", ondelete="CASCADE"), nullable=False)
    model_id = Column(UUID(as_uuid=True), ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    guid = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(500))
    elevation = Column(Numeric(10, 3))
    building_id = Column(UUID(as_uuid=True), ForeignKey("elements.id"))
    properties = Column(JSONB)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint("model_id", "guid", name="uq_storeys_model_guid"),
    )
