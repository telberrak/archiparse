"""
Points d'extrémité pour les clients (maîtres d'ouvrage)

Gère le CRUD des clients d'un locataire. Un client regroupe plusieurs
projets (voir projects.py), eux-mêmes regroupant plusieurs modèles.

Suppression douce : supprimer un client ne retire rien de la base — il est
marqué status='deleted', tout comme ses projets et les modèles de ces
projets (cascade client -> projet -> modèle). Une entité 'deleted' est
traitée comme inexistante par le reste de l'API (list/get/update la
filtrent), donc invisible dans l'application, sans perdre l'historique.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional

from app.core.dependencies import get_tenant_id, get_db_session
from app.models.database import Client, Model, Project

router = APIRouter(prefix="/clients", tags=["clients"])


class ClientCreate(BaseModel):
    name: str = Field(..., max_length=255)
    contact_name: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    notes: Optional[str] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    contact_name: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    notes: Optional[str] = None


def _serialize(client: Client, project_count: int = 0) -> dict:
    return {
        "id": str(client.id),
        "name": client.name,
        "contact_name": client.contact_name,
        "email": client.email,
        "phone": client.phone,
        "address": client.address,
        "notes": client.notes,
        "project_count": project_count,
        "created_at": client.created_at.isoformat() if client.created_at else None,
        "updated_at": client.updated_at.isoformat() if client.updated_at else None,
    }


@router.get("")
def list_clients(
    status_filter: str = Query("active", alias="status", pattern="^(active|deleted)$"),
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session),
):
    """Liste les clients du locataire (actifs par défaut, ou archivés avec
    ?status=deleted — voir /archives côté frontend), avec le nombre de
    projets actifs de chacun."""
    clients = (
        db.query(Client)
        .filter(Client.tenant_id == tenant_id, Client.status == status_filter)
        .order_by(Client.name)
        .all()
    )

    counts = dict(
        db.query(Project.client_id, func.count(Project.id))
        .filter(Project.tenant_id == tenant_id, Project.status == "active")
        .group_by(Project.client_id)
        .all()
    )

    return [_serialize(c, counts.get(c.id, 0)) for c in clients]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session),
):
    """Crée un nouveau client."""
    client = Client(tenant_id=tenant_id, **payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return _serialize(client)


@router.get("/{client_id}")
def get_client(
    client_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session),
):
    """Récupère le détail d'un client actif."""
    client = db.query(Client).filter(
        Client.id == client_id, Client.tenant_id == tenant_id, Client.status == "active"
    ).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client non trouvé")

    project_count = db.query(Project).filter(Project.client_id == client_id, Project.status == "active").count()
    return _serialize(client, project_count)


@router.put("/{client_id}")
def update_client(
    client_id: UUID,
    payload: ClientUpdate,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session),
):
    """Met à jour un client actif."""
    client = db.query(Client).filter(
        Client.id == client_id, Client.tenant_id == tenant_id, Client.status == "active"
    ).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client non trouvé")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    project_count = db.query(Project).filter(Project.client_id == client_id, Project.status == "active").count()
    return _serialize(client, project_count)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session),
):
    """Supprime (en douceur) un client, et en cascade tous ses projets actifs
    puis tous les modèles actifs de ces projets — rien n'est retiré de la
    base, tout passe à status='deleted' et disparaît de l'application."""
    client = db.query(Client).filter(
        Client.id == client_id, Client.tenant_id == tenant_id, Client.status == "active"
    ).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client non trouvé")

    projects = db.query(Project).filter(Project.client_id == client_id, Project.status == "active").all()
    for project in projects:
        models = db.query(Model).filter(Model.project_id == project.id, Model.status == "active").all()
        for model in models:
            model.status = "deleted"
        project.status = "deleted"

    client.status = "deleted"
    db.commit()
    return None


@router.post("/{client_id}/restore")
def restore_client(
    client_id: UUID,
    tenant_id: UUID = Depends(get_tenant_id),
    db: Session = Depends(get_db_session),
):
    """Restaure un client archivé (voir /archives), et en cascade tous les
    projets et modèles qui avaient été archivés avec lui — l'inverse exact
    de delete_client. Ne touche pas les projets déjà actifs (impossible en
    théorie sous un client 'deleted') ni ceux déjà archivés indépendamment."""
    client = db.query(Client).filter(
        Client.id == client_id, Client.tenant_id == tenant_id, Client.status == "deleted"
    ).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client archivé non trouvé")

    projects = db.query(Project).filter(Project.client_id == client_id, Project.status == "deleted").all()
    for project in projects:
        models = db.query(Model).filter(Model.project_id == project.id, Model.status == "deleted").all()
        for model in models:
            model.status = "active"
        project.status = "active"

    client.status = "active"
    db.commit()
    db.refresh(client)
    project_count = db.query(Project).filter(Project.client_id == client_id, Project.status == "active").count()
    return _serialize(client, project_count)
