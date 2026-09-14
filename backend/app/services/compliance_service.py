"""
Contrôles réglementaires (indicatifs) pour le contexte marocain

Comme quality_service.py : contrôles déterministes, basés sur des règles
explicites, pas d'IA/LLM. Ce ne sont PAS des contrôles de conformité
réglementaire certifiés (RPS 2011, RTCM, etc.) — seulement des vérifications
de bon sens sur les données déjà résolues par le parseur, présentées comme
"à vérifier" plutôt que "non conforme", pour aider le métreur/BE à repérer
rapidement ce qui mérite un second regard.
"""

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.database import Element as ElementModel, Storey
from app.utils.ifc_utils import (
    AREA_CANDIDATES,
    flatten_properties,
    flatten_quantities,
    pick_quantity_value,
)

# Seuils indicatifs, volontairement conservateurs (peu de faux positifs).
MIN_HABITABLE_SPACE_AREA_M2 = 9.0
MIN_LOADBEARING_WALL_WIDTH_M = 0.15
MAX_GLAZING_TO_WALL_RATIO = 0.6

WALL_TYPES = {"IfcWall", "IfcWallStandardCase"}


@dataclass
class ComplianceWarning:
    element_id: Optional[str]
    ifc_type: str
    name: Optional[str]
    storey: Optional[str]
    rule: str
    message: str


def _storey_names(elements: List[ElementModel], db: Session) -> Dict[UUID, str]:
    storey_ids = {e.storey_id for e in elements if e.storey_id}
    names: Dict[UUID, str] = {}
    if storey_ids:
        for storey in db.query(Storey).filter(Storey.element_id.in_(storey_ids)).all():
            names[storey.element_id] = storey.name or ""
    return names


class ComplianceService:
    """Contrôles indicatifs (« à vérifier ») sur un modèle déjà parsé."""

    def check_model(self, model_id: UUID, tenant_id: UUID, db: Session) -> Dict[str, Any]:
        elements = (
            db.query(ElementModel)
            .filter(
                ElementModel.model_id == model_id,
                ElementModel.tenant_id == tenant_id,
            )
            .all()
        )
        storey_names = _storey_names(elements, db)

        warnings: List[ComplianceWarning] = []
        warnings.extend(self._check_small_spaces(elements, storey_names))
        warnings.extend(self._check_thin_loadbearing_walls(elements, storey_names))
        warnings.extend(self._check_glazing_ratio(elements))

        by_rule: Dict[str, int] = {}
        for w in warnings:
            by_rule[w.rule] = by_rule.get(w.rule, 0) + 1

        return {
            "warnings": [asdict(w) for w in warnings],
            "summary": {
                "elements_checked": len(elements),
                "warnings_count": len(warnings),
                "warnings_by_rule": by_rule,
            },
        }

    def _check_small_spaces(
        self, elements: List[ElementModel], storey_names: Dict[UUID, str]
    ) -> List[ComplianceWarning]:
        warnings: List[ComplianceWarning] = []
        for elem in elements:
            if elem.ifc_type != "IfcSpace":
                continue
            flat_q = flatten_quantities(elem.quantities)
            area = pick_quantity_value(flat_q, AREA_CANDIDATES)
            if area is None or area >= MIN_HABITABLE_SPACE_AREA_M2:
                continue
            identity = elem.name or elem.tag or str(elem.id)
            warnings.append(ComplianceWarning(
                element_id=str(elem.id),
                ifc_type=elem.ifc_type,
                name=elem.name,
                storey=storey_names.get(elem.storey_id) if elem.storey_id else None,
                rule="small_space",
                message=(
                    f"Espace « {identity} » : surface de {area:.1f} m² — à vérifier "
                    f"vis-à-vis des normes d'habitabilité (seuil indicatif {MIN_HABITABLE_SPACE_AREA_M2:.0f} m²)"
                ),
            ))
        return warnings

    def _check_thin_loadbearing_walls(
        self, elements: List[ElementModel], storey_names: Dict[UUID, str]
    ) -> List[ComplianceWarning]:
        warnings: List[ComplianceWarning] = []
        for elem in elements:
            if elem.ifc_type not in WALL_TYPES:
                continue
            flat_p = flatten_properties(elem.properties)
            if flat_p.get("LoadBearing") is not True:
                continue
            flat_q = flatten_quantities(elem.quantities)
            width = pick_quantity_value(flat_q, ["Width"])
            if width is None or width >= MIN_LOADBEARING_WALL_WIDTH_M:
                continue
            identity = elem.name or elem.tag or str(elem.id)
            warnings.append(ComplianceWarning(
                element_id=str(elem.id),
                ifc_type=elem.ifc_type,
                name=elem.name,
                storey=storey_names.get(elem.storey_id) if elem.storey_id else None,
                rule="thin_loadbearing_wall",
                message=(
                    f"Mur porteur « {identity} » : épaisseur de {width * 100:.0f} cm — à vérifier "
                    f"vis-à-vis du dimensionnement structurel (seuil indicatif {MIN_LOADBEARING_WALL_WIDTH_M * 100:.0f} cm)"
                ),
            ))
        return warnings

    def _check_glazing_ratio(self, elements: List[ElementModel]) -> List[ComplianceWarning]:
        """Contrôle grossier, à l'échelle du bâtiment entier (pas par façade) :
        ratio surface vitrée / surface des murs extérieurs. Ignoré si l'une des
        deux surfaces n'est pas résolvable (pas de faux positif sans donnée)."""
        by_building: Dict[Optional[UUID], Dict[str, float]] = {}

        for elem in elements:
            building_id = elem.building_id
            bucket = by_building.setdefault(building_id, {"wall_area": 0.0, "window_area": 0.0})

            if elem.ifc_type in WALL_TYPES:
                flat_p = flatten_properties(elem.properties)
                if flat_p.get("IsExternal") is not True:
                    continue
                flat_q = flatten_quantities(elem.quantities)
                area = pick_quantity_value(flat_q, AREA_CANDIDATES)
                if area:
                    bucket["wall_area"] += area
            elif elem.ifc_type == "IfcWindow":
                flat_q = flatten_quantities(elem.quantities)
                area = pick_quantity_value(flat_q, AREA_CANDIDATES)
                if area:
                    bucket["window_area"] += area

        warnings: List[ComplianceWarning] = []
        for building_id, areas in by_building.items():
            wall_area = areas["wall_area"]
            window_area = areas["window_area"]
            if wall_area <= 0 or window_area <= 0:
                continue
            ratio = window_area / (wall_area + window_area)
            if ratio <= MAX_GLAZING_TO_WALL_RATIO:
                continue
            warnings.append(ComplianceWarning(
                element_id=str(building_id) if building_id else None,
                ifc_type="IfcBuilding",
                name=None,
                storey=None,
                rule="glazing_ratio",
                message=(
                    f"Ratio de vitrage élevé ({ratio * 100:.0f} % de la surface murs+fenêtres) — "
                    f"à vérifier vis-à-vis de la performance thermique (seuil indicatif {MAX_GLAZING_TO_WALL_RATIO * 100:.0f} %)"
                ),
            ))
        return warnings


compliance_service = ComplianceService()
