"""
Schémas Pydantic pour validation des requêtes/réponses
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from enum import Enum


class JobStatus(str, Enum):
    """Statuts possibles d'une tâche"""
    EN_ATTENTE = "EN_ATTENTE"
    VALIDATION = "VALIDATION"
    VALIDE = "VALIDE"
    PARSING = "PARSING"
    TRANSFORMATION = "TRANSFORMATION"
    TERMINE = "TERMINE"
    ECHOUE = "ECHOUE"


class IFCVersion(str, Enum):
    """Versions IFC supportées"""
    IFC2X3 = "IFC2X3"
    IFC4 = "IFC4"


# ========== Upload ==========

class UploadResponse(BaseModel):
    """Réponse après upload de fichier"""
    job_id: UUID
    filename: str
    file_size: int
    status: JobStatus
    message: str


# ========== Jobs ==========

class JobBase(BaseModel):
    """Schéma de base pour une tâche"""
    filename: str
    file_size: int
    status: JobStatus
    ifc_version: Optional[IFCVersion] = None


class JobCreate(JobBase):
    """Schéma pour création de tâche"""
    file_path: str


class JobResponse(JobBase):
    """Schéma de réponse pour une tâche"""
    id: UUID
    tenant_id: UUID
    file_path: str
    error_message: Optional[str] = None
    validation_errors: Optional[List[Dict[str, Any]]] = None
    metadata: Optional[Dict[str, Any]] = Field(None, alias="job_metadata")
    created_at: datetime
    updated_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True, "populate_by_name": True}


class JobListResponse(BaseModel):
    """Réponse pour liste de tâches"""
    jobs: List[JobResponse]
    total: int
    page: int = 1
    page_size: int = 20


# ========== Validation ==========

class ValidationError(BaseModel):
    """Erreur de validation XSD"""
    line: int
    column: int
    message: str
    element: Optional[str] = None


class ValidationResponse(BaseModel):
    """Réponse de validation"""
    is_valid: bool
    ifc_version: Optional[IFCVersion] = None
    errors: List[ValidationError] = []
    warnings: List[str] = []


# ========== Models ==========

class ModelResponse(BaseModel):
    """Réponse pour un modèle"""
    id: UUID
    job_id: UUID
    tenant_id: UUID
    name: Optional[str] = None
    description: Optional[str] = None
    project_guid: Optional[UUID] = None
    statistics: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}

