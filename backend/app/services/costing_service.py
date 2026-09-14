"""
Service de chiffrage (avant-métré chiffré)

Combine les quantités déjà résolues par le parseur (voir parser_service.py)
avec le catalogue de prix unitaires du locataire (price_catalog_items) pour
produire un avant-métré chiffré. Le catalogue peut contenir plusieurs prix
pour un même type IFC (ex: « Mur brique 20cm » et « Mur béton 30cm » sont
deux IfcWall à prix différents) : chaque élément est donc rattaché à une
entrée précise du catalogue, pas seulement à un type.

Résolution du prix effectif d'un élément (voir `resolve_effective_price_item`) :
1. Assignation explicite (Element.price_catalog_item_id, voir elements.py) si elle existe.
2. Sinon, si le catalogue ne contient qu'une seule entrée pour ce type IFC,
   elle est utilisée par défaut (pas de friction pour le cas simple).
3. Sinon, l'élément est laissé de côté (listé dans `unmatched_types`) — il
   faut que l'utilisateur choisisse explicitement parmi les entrées possibles.

Résolution de la quantité d'un élément (voir `compute_element_cost_quantity`) :
1. Si une quantité corrigée manuellement existe (Element.quantity_override_*)
   ET que son unité correspond à celle du prix effectif, elle est utilisée.
2. Sinon, la quantité est dérivée des Qto résolus par le parseur.
3. Une correction dont l'unité ne correspond plus (ex: après réassignation
   à un prix d'une autre unité) est ignorée plutôt que mal appliquée —
   jamais de calcul silencieusement faux.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.database import Element as ElementModel, PriceCatalogItem
from app.utils.ifc_utils import (
    AREA_CANDIDATES,
    VOLUME_CANDIDATES,
    flatten_quantities,
    pick_quantity_value,
)

# Grandeur "canonique" à résoudre selon l'unité du prix catalogue.
_LENGTH_CANDIDATES = ["Length", "NetLength", "GrossLength"]
_UNIT_TO_CANDIDATES: Dict[str, List[str]] = {
    "m²": AREA_CANDIDATES,
    "m³": VOLUME_CANDIDATES,
    "ml": _LENGTH_CANDIDATES,
}

# Répartition des types IFC en lots (nomenclature DPGF telle qu'utilisée par
# les BE/métreurs marocains : gros œuvre, second œuvre, lots techniques...).
# Chaque type appartient à exactement un lot ; un type qui n'y figure pas
# (ex: ifc_type saisi directement en base hors du sélecteur du catalogue)
# tombe dans le lot "Non classé" plutôt que d'être silencieusement recatégorisé.
LOT_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "code": "gros_oeuvre",
        "label": "Lot 1 — Gros œuvre",
        "ifc_types": [
            "IfcWall", "IfcWallStandardCase", "IfcSlab", "IfcSlabStandardCase", "IfcSlabElementedCase",
            "IfcBeam", "IfcBeamStandardCase", "IfcColumn", "IfcColumnStandardCase", "IfcFooting", "IfcPile",
            "IfcRamp", "IfcRampFlight", "IfcStair", "IfcStairFlight", "IfcRoof", "IfcBuildingElementPart",
            "IfcElementAssembly", "IfcReinforcingBar", "IfcReinforcingMesh", "IfcTendon", "IfcTendonAnchor",
        ],
    },
    {
        "code": "second_oeuvre",
        "label": "Lot 2 — Second œuvre (menuiseries & cloisons)",
        "ifc_types": [
            "IfcWallElementedCase", "IfcDoor", "IfcDoorStandardCase", "IfcWindow", "IfcWindowStandardCase",
            "IfcCurtainWall", "IfcPlate", "IfcPlateStandardCase", "IfcMember", "IfcMemberStandardCase",
            "IfcRailing", "IfcCovering", "IfcOpeningElement", "IfcOpeningStandardCase",
            "IfcBuildingElementProxy", "IfcMechanicalFastener", "IfcFastener", "IfcDiscreteAccessory",
            "IfcChimney",
        ],
    },
    {
        "code": "cvc",
        "label": "Lot 3 — CVC (chauffage, ventilation, climatisation)",
        "ifc_types": [
            "IfcAirTerminal", "IfcAirTerminalBox", "IfcAirToAirHeatRecovery", "IfcBoiler", "IfcBurner",
            "IfcChiller", "IfcCoil", "IfcCompressor", "IfcCondenser", "IfcCoolingTower", "IfcDamper",
            "IfcDuctFitting", "IfcDuctSegment", "IfcDuctSilencer", "IfcEvaporativeCooler", "IfcEvaporator",
            "IfcFan", "IfcFilter", "IfcHeatExchanger", "IfcHumidifier", "IfcSpaceHeater", "IfcTubeBundle",
            "IfcUnitaryControlElement", "IfcUnitaryEquipment", "IfcVibrationIsolator", "IfcCooledBeam",
        ],
    },
    {
        "code": "plomberie",
        "label": "Lot 4 — Plomberie & sanitaire",
        "ifc_types": [
            "IfcPipeFitting", "IfcPipeSegment", "IfcPump", "IfcValve", "IfcInterceptor",
            "IfcSanitaryTerminal", "IfcStackTerminal", "IfcWasteTerminal", "IfcFireSuppressionTerminal",
            "IfcTank",
        ],
    },
    {
        "code": "electricite",
        "label": "Lot 5 — Électricité & courants faibles",
        "ifc_types": [
            "IfcActuator", "IfcAlarm", "IfcAudioVisualAppliance", "IfcCableCarrierFitting",
            "IfcCableCarrierSegment", "IfcCableFitting", "IfcCableSegment", "IfcCommunicationsAppliance",
            "IfcController", "IfcElectricAppliance", "IfcElectricDistributionBoard",
            "IfcElectricFlowStorageDevice", "IfcElectricGenerator", "IfcElectricMotor",
            "IfcElectricTimeControl", "IfcEngine", "IfcLamp", "IfcLightFixture", "IfcOutlet",
            "IfcProtectiveDevice", "IfcProtectiveDeviceTrippingUnit", "IfcSensor", "IfcSolarDevice",
            "IfcSwitchingDevice", "IfcTransformer", "IfcMedicalDevice",
        ],
    },
    {
        "code": "reseaux_divers",
        "label": "Lot 6 — Réseaux techniques divers",
        "ifc_types": [
            "IfcDistributionChamberElement", "IfcDistributionControlElement", "IfcDistributionElement",
            "IfcDistributionFlowElement", "IfcFlowController", "IfcFlowFitting", "IfcFlowInstrument",
            "IfcFlowMeter", "IfcFlowMovingDevice", "IfcFlowSegment", "IfcFlowStorageDevice",
            "IfcFlowTerminal", "IfcFlowTreatmentDevice", "IfcEnergyConversionDevice", "IfcMotorConnection",
            "IfcJunctionBox",
        ],
    },
    {
        "code": "amenagement",
        "label": "Lot 7 — Aménagements & mobilier",
        "ifc_types": ["IfcFurnishingElement", "IfcFurniture", "IfcSystemFurnitureElement"],
    },
    {
        "code": "divers",
        "label": "Lot 8 — Divers",
        "ifc_types": [
            "IfcCivilElement", "IfcGeographicElement", "IfcProjectionElement", "IfcShadingDevice",
            "IfcSurfaceFeature", "IfcTransportElement", "IfcVirtualElement", "IfcVoidingFeature",
        ],
    },
    {
        "code": "espaces",
        "label": "Espaces (surfaces de référence)",
        "ifc_types": ["IfcSpace"],
    },
]

# Conteneurs de hiérarchie IFC (projet/site/bâtiment/étage) — jamais des
# ouvrages chiffrables, on les exclut avant même le calcul plutôt que de les
# faire apparaître comme "types sans prix renseigné".
_CONTAINER_TYPES = {"IfcProject", "IfcSite", "IfcBuilding", "IfcBuildingStorey"}

_UNCLASSIFIED_LOT = {"code": "non_classe", "label": "Non classé"}

_IFC_TYPE_TO_LOT: Dict[str, Dict[str, str]] = {
    ifc_type: {"code": lot["code"], "label": lot["label"]}
    for lot in LOT_DEFINITIONS
    for ifc_type in lot["ifc_types"]
}

_LOT_ORDER: Dict[str, int] = {lot["code"]: i for i, lot in enumerate(LOT_DEFINITIONS)}


def get_lot_for_ifc_type(ifc_type: str) -> Dict[str, str]:
    return _IFC_TYPE_TO_LOT.get(ifc_type, _UNCLASSIFIED_LOT)


@dataclass
class CatalogIndex:
    by_id: Dict[UUID, PriceCatalogItem]
    by_type: Dict[str, List[PriceCatalogItem]]


def build_catalog_index(tenant_id: UUID, db: Session) -> CatalogIndex:
    items = db.query(PriceCatalogItem).filter(PriceCatalogItem.tenant_id == tenant_id).all()
    by_id: Dict[UUID, PriceCatalogItem] = {item.id: item for item in items}
    by_type: Dict[str, List[PriceCatalogItem]] = {}
    for item in items:
        by_type.setdefault(item.ifc_type, []).append(item)
    return CatalogIndex(by_id=by_id, by_type=by_type)


def resolve_effective_price_item(
    elem: ElementModel, catalog: CatalogIndex
) -> Optional[PriceCatalogItem]:
    """Prix effectif d'un élément : assignation explicite, sinon prix unique
    du type s'il n'y en a qu'un, sinon aucun (ambigu — à préciser)."""
    if elem.price_catalog_item_id and elem.price_catalog_item_id in catalog.by_id:
        return catalog.by_id[elem.price_catalog_item_id]
    candidates = catalog.by_type.get(elem.ifc_type)
    if candidates and len(candidates) == 1:
        return candidates[0]
    return None


def _resolve_quantity(flat_quantities: Dict[str, Any], unit: str) -> Optional[float]:
    if unit == "u":
        return 1.0
    candidates = _UNIT_TO_CANDIDATES.get(unit)
    if not candidates:
        return None
    return pick_quantity_value(flat_quantities, candidates)


@dataclass
class ElementCostQuantity:
    price_item: Optional[PriceCatalogItem]
    resolved_quantity: Optional[float]  # valeur brute issue du parsing IFC
    effective_quantity: Optional[float]  # valeur réellement utilisée pour le chiffrage
    is_override_applied: bool
    override_ignored: bool  # correction présente mais unité incompatible avec le prix actuel


def compute_element_cost_quantity(elem: ElementModel, catalog: CatalogIndex) -> ElementCostQuantity:
    """Résout, pour un élément donné, le prix effectif et la quantité à
    utiliser pour le chiffrage (corrigée manuellement si applicable)."""
    price_item = resolve_effective_price_item(elem, catalog)
    if not price_item:
        return ElementCostQuantity(None, None, None, False, False)

    flat_q = flatten_quantities(elem.quantities)
    resolved = _resolve_quantity(flat_q, price_item.unit)

    override_value = (
        float(elem.quantity_override_value) if elem.quantity_override_value is not None else None
    )
    override_unit = elem.quantity_override_unit

    if override_value is not None and override_unit == price_item.unit:
        return ElementCostQuantity(price_item, resolved, override_value, True, False)
    if override_value is not None and override_unit != price_item.unit:
        return ElementCostQuantity(price_item, resolved, resolved, False, True)
    return ElementCostQuantity(price_item, resolved, resolved, False, False)


class CostingService:
    """Calcule un avant-métré chiffré pour un modèle déjà parsé."""

    def estimate_model(self, model_id: UUID, tenant_id: UUID, db: Session) -> Dict[str, Any]:
        elements = (
            db.query(ElementModel)
            .filter(
                ElementModel.model_id == model_id,
                ElementModel.tenant_id == tenant_id,
                ~ElementModel.ifc_type.in_(_CONTAINER_TYPES),
            )
            .all()
        )

        catalog = build_catalog_index(tenant_id, db)

        totals: Dict[UUID, Dict[str, Any]] = {}
        unmatched_counts: Dict[str, int] = {}

        for elem in elements:
            cq = compute_element_cost_quantity(elem, catalog)
            if not cq.price_item or cq.effective_quantity is None:
                unmatched_counts[elem.ifc_type] = unmatched_counts.get(elem.ifc_type, 0) + 1
                continue

            price_item = cq.price_item
            bucket = totals.setdefault(price_item.id, {
                "ifc_type": price_item.ifc_type,
                "label": price_item.label,
                "unit": price_item.unit,
                "unit_price": float(price_item.unit_price),
                "quantity": 0.0,
                "element_count": 0,
            })
            bucket["quantity"] += cq.effective_quantity
            bucket["element_count"] += 1

        line_items: List[Dict[str, Any]] = []
        for bucket in totals.values():
            bucket["quantity"] = round(bucket["quantity"], 3)
            bucket["total"] = round(bucket["quantity"] * bucket["unit_price"], 2)
            line_items.append(bucket)

        line_items.sort(key=lambda li: (li["ifc_type"], li["label"]))

        lots_by_code: Dict[str, Dict[str, Any]] = {}
        for li in line_items:
            lot_info = get_lot_for_ifc_type(li["ifc_type"])
            lot = lots_by_code.setdefault(lot_info["code"], {
                "code": lot_info["code"],
                "label": lot_info["label"],
                "line_items": [],
                "subtotal": 0.0,
            })
            lot["line_items"].append(li)
            lot["subtotal"] += li["total"]

        lots = sorted(
            lots_by_code.values(),
            key=lambda lot: _LOT_ORDER.get(lot["code"], len(LOT_DEFINITIONS)),
        )
        for lot in lots:
            lot["subtotal"] = round(lot["subtotal"], 2)

        grand_total = round(sum(lot["subtotal"] for lot in lots), 2)

        unmatched_types = [
            {
                "ifc_type": ifc_type,
                "element_count": count,
                "lot_label": get_lot_for_ifc_type(ifc_type)["label"],
            }
            for ifc_type, count in sorted(unmatched_counts.items())
        ]

        return {
            "lots": lots,
            "unmatched_types": unmatched_types,
            "grand_total": grand_total,
            "currency": "MAD",
        }


costing_service = CostingService()
