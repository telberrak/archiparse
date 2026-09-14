"""
Points d'extrémité pour les projets

Gère le CRUD des projets d'un locataire. Un projet appartient à un client
(voir clients.py) et regroupe plusieurs modèles (voir models.py).

Suppression douce : supprimer un projet le marque status='deleted' ainsi
que tous ses modèles actifs (cascade projet -> modèle), sans rien retirer
de la base — voir clients.py pour la cascade de niveau supérieur
(client -> projet -> modèle).
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from app.core.dependencies import get_tenant_id, get_db_session
from app.models.database import Client, Model, Project

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    client_id: UUID
    name: str = Field(..., max_length=255)
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None


def _serialize(project: Project, client_name: Optional[str] = None, model_count: int = 0) -> dict:
    return {
        "id": str(project.id),
        "client_id": str(project.client_id),
        "client_name": client_name,
        "name": project.name,
        "description": project.description,
        "model_count": model_count,
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None,
    }


@router.get("")
def list_projects(
    client_id: Optional[UUID] = Query(None),
    status_filter: str = Query("active", alias="status", pattern="^(active|deleted)$"),
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session),
):
    """Liste les projets du locataire (actifs par défaut, ou archivés avec
    ?status=deleted), optionnellement filtrés par client."""
    query = db.query(Project).filter(Project.tenant_id == tenant_id, Project.status == status_filter)
    if client_id:
        query = query.filter(Project.client_id == client_id)
    projects = query.order_by(Project.name).all()

    client_names = dict(db.query(Client.id, Client.name).filter(Client.tenant_id == tenant_id).all())
    model_counts = dict(
        db.query(Model.project_id, func.count(Model.id))
        .filter(Model.tenant_id == tenant_id, Model.project_id.isnot(None), Model.status == "active")
        .group_by(Model.project_id)
        .all()
    )

    return [
        _serialize(p, client_names.get(p.client_id), model_counts.get(p.id, 0))
        for p in projects
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session),
):
    """Crée un nouveau projet, rattaché à un client actif du locataire."""
    client = db.query(Client).filter(
        Client.id == payload.client_id, Client.tenant_id == tenant_id, Client.status == "active"
    ).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client non trouvé")

    project = Project(tenant_id=tenant_id, **payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return _serialize(project, client.name)


@router.get("/{project_id}")
def get_project(
    project_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session),
):
    """Récupère le détail d'un projet actif."""
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == tenant_id, Project.status == "active"
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet non trouvé")

    model_count = db.query(Model).filter(Model.project_id == project_id, Model.status == "active").count()
    return _serialize(project, project.client.name if project.client else None, model_count)


@router.put("/{project_id}")
def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session),
):
    """Met à jour un projet actif (le client d'un projet ne se réassigne pas
    — on en crée un nouveau si le projet a en fait été mal rattaché)."""
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == tenant_id, Project.status == "active"
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet non trouvé")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    model_count = db.query(Model).filter(Model.project_id == project_id, Model.status == "active").count()
    return _serialize(project, project.client.name if project.client else None, model_count)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session),
):
    """Supprime (en douceur) un projet, et en cascade tous ses modèles
    actifs — rien n'est retiré de la base, tout passe à status='deleted'
    et disparaît de l'application."""
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == tenant_id, Project.status == "active"
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet non trouvé")

    models = db.query(Model).filter(Model.project_id == project_id, Model.status == "active").all()
    for model in models:
        model.status = "deleted"

    project.status = "deleted"
    db.commit()
    return None


@router.post("/{project_id}/restore")
def restore_project(
    project_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session),
):
    """Restaure un projet archivé (voir /archives) et tous ses modèles
    archivés. Si son client avait lui aussi été archivé (le projet a été
    supprimé via une cascade client -> projet), le client est restauré avec
    lui pour qu'un projet actif ait toujours un client actif — mais ses
    autres projets restent archivés, seule l'ascendance directe est touchée."""
    project = db.query(Project).filter(
        Project.id == project_id, Project.tenant_id == tenant_id, Project.status == "deleted"
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet archivé non trouvé")

    if project.client and project.client.status == "deleted":
        project.client.status = "active"

    models = db.query(Model).filter(Model.project_id == project_id, Model.status == "deleted").all()
    for model in models:
        model.status = "active"

    project.status = "active"
    db.commit()
    db.refresh(project)
    model_count = db.query(Model).filter(Model.project_id == project_id, Model.status == "active").count()
    return _serialize(project, project.client.name if project.client else None, model_count)
