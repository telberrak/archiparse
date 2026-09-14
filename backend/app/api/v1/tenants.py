"""
Points d'extrémité pour le locataire courant (informations, image de marque)

Gère le nom du locataire et le logo affiché dans les rapports
(Excel/PDF/DPGF) — voir report_service.py.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.dependencies import get_verified_tenant, get_db_session
from app.models.database import Tenant

router = APIRouter(prefix="/tenants", tags=["tenants"])

ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/svg+xml"}
MAX_LOGO_SIZE = 2 * 1024 * 1024  # 2MB


class TenantUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


@router.get("/me")
def get_current_tenant(tenant: Tenant = Depends(get_verified_tenant)):
    """Retourne les informations du locataire courant, dont la présence d'un logo."""
    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "has_logo": tenant.logo_data is not None,
    }


@router.put("/me")
def update_current_tenant(
    payload: TenantUpdate,
    tenant: Tenant = Depends(get_verified_tenant),
    db: Session = Depends(get_db_session),
):
    """Met à jour le nom du locataire (cabinet/entreprise)."""
    tenant.name = payload.name.strip()
    db.commit()
    db.refresh(tenant)
    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "has_logo": tenant.logo_data is not None,
    }


@router.post("/me/logo", status_code=status.HTTP_204_NO_CONTENT)
async def upload_tenant_logo(
    file: UploadFile = File(...),
    tenant: Tenant = Depends(get_verified_tenant),
    db: Session = Depends(get_db_session),
):
    """Téléverse (ou remplace) le logo du locataire, utilisé sur les rapports."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format non supporté. Utilisez PNG, JPEG ou SVG.",
        )

    content = await file.read()
    if len(content) > MAX_LOGO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Logo trop volumineux. Maximum {MAX_LOGO_SIZE // (1024 * 1024)}MB.",
        )

    tenant.logo_data = content
    tenant.logo_content_type = file.content_type
    db.commit()
    return None


@router.get("/me/logo")
def get_tenant_logo(
    tenant: Tenant = Depends(get_verified_tenant),
):
    """Retourne le logo brut du locataire (pour prévisualisation)."""
    if not tenant.logo_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aucun logo enregistré")
    return Response(content=tenant.logo_data, media_type=tenant.logo_content_type or "application/octet-stream")


@router.delete("/me/logo", status_code=status.HTTP_204_NO_CONTENT)
def delete_tenant_logo(
    tenant: Tenant = Depends(get_verified_tenant),
    db: Session = Depends(get_db_session),
):
    """Supprime le logo du locataire (les rapports reviennent à l'en-tête par défaut)."""
    tenant.logo_data = None
    tenant.logo_content_type = None
    db.commit()
    return None
