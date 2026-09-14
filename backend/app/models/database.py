"""
Modèles de base de données SQLAlchemy

Correspond au schéma défini dans docs/DATABASE_SCHEMA.md
"""

from sqlalchemy import Column, String, Text, BigInteger, Boolean, ForeignKey, Numeric, UniqueConstraint, LargeBinary
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMP
from sqlalchemy.orm import relationship, backref
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

    # Image de marque pour les rapports (Excel/PDF/DPGF)
    logo_data = Column(LargeBinary)
    logo_content_type = Column(String(100))


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
    # Réinitialisation de mot de passe (jeton à usage unique, voir auth.py)
    reset_token = Column(String(255), unique=True)
    reset_token_expires_at = Column(TIMESTAMP(timezone=True))

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


class Client(Base):
    """Table des clients (maîtres d'ouvrage) d'un locataire"""

    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    contact_name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    address = Column(Text)
    notes = Column(Text)
    # Suppression douce : un client supprimé est marqué 'deleted' plutôt que
    # retiré de la base, et disparaît de l'application — voir clients.py
    # delete_client() pour la cascade vers ses projets puis leurs modèles.
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())

    tenant = relationship("Tenant", backref="clients")


class Project(Base):
    """Table des projets, rattachés à un client"""

    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    # Suppression douce : voir Client.status et projects.py delete_project()
    # pour la cascade vers les modèles de ce projet.
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())

    tenant = relationship("Tenant", backref="projects")
    # passive_deletes=True: laisse la contrainte ON DELETE CASCADE de la DB
    # gérer la suppression des projets quand leur client est supprimé, plutôt
    # que l'ORM tente de mettre client_id à NULL (invalide : colonne NOT NULL).
    client = relationship("Client", backref=backref("projects", passive_deletes=True))


class Job(Base):
    """Table des tâches de traitement"""

    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
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
    project = relationship("Project", backref=backref("jobs", passive_deletes=True))
    model = relationship("Model", backref="job", uselist=False)


class Model(Base):
    """Table des modèles IFC parsés"""

    __tablename__ = "models"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(500))
    description = Column(Text)
    project_guid = Column(UUID(as_uuid=True))
    statistics = Column(JSONB)
    # Suppression douce : marqué 'deleted' en cascade quand son projet (ou le
    # client de son projet) est supprimé — voir projects.py/clients.py.
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())

    project = relationship("Project", backref=backref("models", passive_deletes=True))

    @property
    def project_name(self):
        return self.project.name if self.project else None

    @property
    def client_id(self):
        return self.project.client_id if self.project else None

    @property
    def client_name(self):
        return self.project.client.name if self.project and self.project.client else None


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
    # Prix unitaire assigné manuellement (avant-métré chiffré) — voir price_catalog_items.
    # Optionnel : si non assigné, costing_service applique un prix par défaut uniquement
    # quand le catalogue ne contient qu'une seule entrée pour ce type IFC.
    price_catalog_item_id = Column(UUID(as_uuid=True), ForeignKey("price_catalog_items.id", ondelete="SET NULL"))
    # Quantité corrigée manuellement pour le métré chiffré (ex: mesure du
    # modèle erronée) — ne modifie jamais la quantité issue du parsing IFC,
    # vient seulement la remplacer au moment du chiffrage. N'est appliquée
    # que si son unité correspond à celle du prix actuellement assigné
    # (voir costing_service.compute_element_cost_quantity) ; sinon ignorée
    # plutôt que silencieusement mal appliquée.
    quantity_override_value = Column(Numeric(14, 3))
    quantity_override_unit = Column(String(20))
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


class PriceCatalogItem(Base):
    """Table du catalogue de prix unitaires (métré chiffré), par locataire.

    Plusieurs entrées peuvent partager le même ifc_type (ex: « Mur brique 20cm »
    et « Mur béton 30cm » sont deux IfcWall avec des prix différents) — voir
    Element.price_catalog_item_id pour l'assignation par élément."""

    __tablename__ = "price_catalog_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    ifc_type = Column(String(100), nullable=False)
    label = Column(String(255), nullable=False)
    unit = Column(String(20), nullable=False)  # m², m³, ml, u
    unit_price = Column(Numeric(12, 2), nullable=False)
    notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())


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
