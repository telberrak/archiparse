"""
Détection de qualité d'export (contrôles déterministes, basés sur des règles)

Vérifie, après la résolution des Psets/Qtos (voir parser_service.py), que les
éléments IFC courants portent les quantités habituellement attendues pour leur
type (ex : un IfcWall sans Longueur/Hauteur/Largeur). Ce n'est pas une
fonctionnalité IA/LLM : uniquement des règles conditionnelles explicites,
faciles à faire évoluer.
"""

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.database import Element as ElementModel, Storey
from app.utils.ifc_utils import (
    AREA_CANDIDATES,
    VOLUME_CANDIDATES,
    WEIGHT_CANDIDATES,
    flatten_quantities,
    pick_quantity_value,
)

# Libellés français des grandeurs "canoniques" utilisées dans les messages.
CANONICAL_LABELS_FR: Dict[str, str] = {
    "Length": "Longueur",
    "Width": "Largeur",
    "Height": "Hauteur",
    "area": "Surface",
    "volume": "Volume",
    "weight": "Poids",
}

# Quantités attendues par type IFC. Une entrée manquante pour un type non
# listé ici n'est pas contrôlée (règle volontairement permissive).
EXPECTED_QUANTITIES: Dict[str, List[str]] = {
    "IfcWall": ["Length", "Height", "Width"],
    "IfcWallStandardCase": ["Length", "Height", "Width"],
    "IfcCurtainWall": ["Length", "Height"],
    "IfcSlab": ["area", "volume"],
    "IfcDoor": ["Width", "Height"],
    "IfcWindow": ["Width", "Height"],
    "IfcBeam": ["Length"],
    "IfcColumn": ["Length"],
    "IfcRoof": ["area"],
    "IfcRailing": ["Length"],
    "IfcCovering": ["area"],
}


def _resolve_canonical(flat_quantities: Dict[str, Any], key: str) -> Optional[float]:
    if key == "area":
        return pick_quantity_value(flat_quantities, AREA_CANDIDATES)
    if key == "volume":
        return pick_quantity_value(flat_quantities, VOLUME_CANDIDATES)
    if key == "weight":
        return pick_quantity_value(flat_quantities, WEIGHT_CANDIDATES)
    return pick_quantity_value(flat_quantities, [key])


@dataclass
class QualityWarning:
    element_id: str
    ifc_type: str
    name: Optional[str]
    tag: Optional[str]
    storey: Optional[str]
    missing: List[str]
    message: str


class QualityService:
    """Contrôle la qualité d'export d'un modèle déjà parsé."""

    def check_model(self, model_id: UUID, tenant_id: UUID, db: Session) -> Dict[str, Any]:
        checked_types = list(EXPECTED_QUANTITIES.keys())
        elements = (
            db.query(ElementModel)
            .filter(
                ElementModel.model_id == model_id,
                ElementModel.tenant_id == tenant_id,
                ElementModel.ifc_type.in_(checked_types),
            )
            .all()
        )

        storey_ids = {e.storey_id for e in elements if e.storey_id}
        storey_names: Dict[UUID, str] = {}
        if storey_ids:
            for storey in db.query(Storey).filter(Storey.element_id.in_(storey_ids)).all():
                storey_names[storey.element_id] = storey.name or ""

        warnings: List[QualityWarning] = []
        for elem in elements:
            expected = EXPECTED_QUANTITIES.get(elem.ifc_type)
            if not expected:
                continue

            flat_q = flatten_quantities(elem.quantities)
            missing = [key for key in expected if _resolve_canonical(flat_q, key) is None]
            if not missing:
                continue

            missing_labels = [CANONICAL_LABELS_FR[key] for key in missing]
            identity = elem.name or elem.tag or str(elem.id)
            warnings.append(QualityWarning(
                element_id=str(elem.id),
                ifc_type=elem.ifc_type,
                name=elem.name,
                tag=elem.tag,
                storey=storey_names.get(elem.storey_id) if elem.storey_id else None,
                missing=missing,
                message=f"{elem.ifc_type} « {identity} » : quantité(s) manquante(s) — {', '.join(missing_labels)}",
            ))

        by_type: Dict[str, int] = {}
        for w in warnings:
            by_type[w.ifc_type] = by_type.get(w.ifc_type, 0) + 1

        return {
            "warnings": [asdict(w) for w in warnings],
            "summary": {
                "elements_checked": len(elements),
                "elements_with_warnings": len(warnings),
                "warnings_by_type": by_type,
            },
        }


quality_service = QualityService()
