"""
Utilitaires spécifiques IFC

Fonctions utilitaires pour le traitement des données IFC.
"""

from typing import Optional, Dict, Any, List
from uuid import UUID, uuid5, NAMESPACE_URL
from lxml.etree import _Element as Element
import math


HIERARCHY_TYPES = {
    "IfcProject",
    "IfcSite",
    "IfcBuilding",
    "IfcBuildingStorey",
    "IfcSpace",
}

ELEMENT_TYPES = {
    # Enveloppe / structure (déjà pris en charge)
    "IfcWall",
    "IfcWallStandardCase",
    "IfcWallElementedCase",
    "IfcSlab",
    "IfcSlabStandardCase",
    "IfcSlabElementedCase",
    "IfcDoor",
    "IfcDoorStandardCase",
    "IfcWindow",
    "IfcWindowStandardCase",
    "IfcBeam",
    "IfcBeamStandardCase",
    "IfcColumn",
    "IfcColumnStandardCase",
    "IfcRoof",
    "IfcStair",
    "IfcStairFlight",
    "IfcRailing",
    "IfcCurtainWall",
    "IfcPlate",
    "IfcPlateStandardCase",
    "IfcMember",
    "IfcMemberStandardCase",
    "IfcCovering",
    "IfcOpeningElement",
    "IfcOpeningStandardCase",
    "IfcBuildingElementProxy",
    "IfcFooting",
    "IfcPile",
    "IfcRamp",
    "IfcRampFlight",
    "IfcCooledBeam",
    "IfcBuildingElementPart",
    "IfcElementAssembly",

    # Renfort structurel
    "IfcReinforcingBar",
    "IfcReinforcingMesh",
    "IfcTendon",
    "IfcTendonAnchor",
    "IfcMechanicalFastener",
    "IfcFastener",
    "IfcDiscreteAccessory",

    # CVC (chauffage, ventilation, climatisation)
    "IfcAirTerminal",
    "IfcAirTerminalBox",
    "IfcAirToAirHeatRecovery",
    "IfcBoiler",
    "IfcBurner",
    "IfcChiller",
    "IfcCoil",
    "IfcCompressor",
    "IfcCondenser",
    "IfcCoolingTower",
    "IfcDamper",
    "IfcDuctFitting",
    "IfcDuctSegment",
    "IfcDuctSilencer",
    "IfcEvaporativeCooler",
    "IfcEvaporator",
    "IfcFan",
    "IfcFilter",
    "IfcHeatExchanger",
    "IfcHumidifier",
    "IfcSpaceHeater",
    "IfcTank",
    "IfcTubeBundle",
    "IfcUnitaryControlElement",
    "IfcUnitaryEquipment",
    "IfcVibrationIsolator",

    # Plomberie / fluides
    "IfcPipeFitting",
    "IfcPipeSegment",
    "IfcPump",
    "IfcValve",
    "IfcInterceptor",
    "IfcSanitaryTerminal",
    "IfcStackTerminal",
    "IfcWasteTerminal",
    "IfcFireSuppressionTerminal",

    # Réseaux génériques (distribution / régulation)
    "IfcDistributionChamberElement",
    "IfcDistributionControlElement",
    "IfcDistributionElement",
    "IfcDistributionFlowElement",
    "IfcFlowController",
    "IfcFlowFitting",
    "IfcFlowInstrument",
    "IfcFlowMeter",
    "IfcFlowMovingDevice",
    "IfcFlowSegment",
    "IfcFlowStorageDevice",
    "IfcFlowTerminal",
    "IfcFlowTreatmentDevice",
    "IfcEnergyConversionDevice",
    "IfcMotorConnection",
    "IfcJunctionBox",

    # Électricité
    "IfcActuator",
    "IfcAlarm",
    "IfcAudioVisualAppliance",
    "IfcCableCarrierFitting",
    "IfcCableCarrierSegment",
    "IfcCableFitting",
    "IfcCableSegment",
    "IfcCommunicationsAppliance",
    "IfcController",
    "IfcElectricAppliance",
    "IfcElectricDistributionBoard",
    "IfcElectricFlowStorageDevice",
    "IfcElectricGenerator",
    "IfcElectricMotor",
    "IfcElectricTimeControl",
    "IfcEngine",
    "IfcLamp",
    "IfcLightFixture",
    "IfcOutlet",
    "IfcProtectiveDevice",
    "IfcProtectiveDeviceTrippingUnit",
    "IfcSensor",
    "IfcSolarDevice",
    "IfcSwitchingDevice",
    "IfcTransformer",
    "IfcMedicalDevice",

    # Mobilier
    "IfcFurnishingElement",
    "IfcFurniture",
    "IfcSystemFurnitureElement",

    # Divers / enveloppe
    "IfcChimney",
    "IfcCivilElement",
    "IfcGeographicElement",
    "IfcProjectionElement",
    "IfcShadingDevice",
    "IfcSurfaceFeature",
    "IfcTransportElement",
    "IfcVirtualElement",
    "IfcVoidingFeature",
}


def local_name(element: Element) -> str:
    tag = element.tag if isinstance(element.tag, str) else ""
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def find_child(element: Element, name: str) -> Optional[Element]:
    for child in element:
        if local_name(child) == name:
            return child
    return None


def find_desc(element: Element, name: str) -> Optional[Element]:
    if local_name(element) == name:
        return element
    for child in element.iter():
        if child is not element and local_name(child) == name:
            return child
    return None


def element_text(element: Optional[Element]) -> Optional[str]:
    if element is None:
        return None
    parts = [t.strip() for t in element.itertext() if t and t.strip()]
    if not parts:
        return None
    return " ".join(parts)


def parse_guid(value: str) -> Optional[UUID]:
    value = (value or "").strip()
    if not value:
        return None
    try:
        return UUID(value)
    except (ValueError, AttributeError):
        pass
    if len(value) == 32:
        try:
            return UUID(value)
        except ValueError:
            pass
    return uuid5(NAMESPACE_URL, f"ifc:{value}")


def extract_xml_id(element: Element) -> Optional[str]:
    xml_id = element.get("id") or element.get("{http://www.w3.org/XML/1998/namespace}id")
    if xml_id:
        return xml_id.lstrip("#")
    return None


def extract_guid(element: Element) -> Optional[UUID]:
    # Selon le schéma ifcXML, GlobalId est un attribut XML de l'élément entité
    # (ex. <IfcWall GlobalId="...">), pas un élément enfant.
    attr_guid = element.get("GlobalId")
    if attr_guid:
        return parse_guid(attr_guid)

    global_id_elem = find_child(element, "GlobalId")
    if global_id_elem is not None:
        guid_str = element_text(global_id_elem)
        if guid_str:
            return parse_guid(guid_str)

    guid_str = extract_xml_id(element)
    if guid_str:
        return parse_guid(guid_str)

    return None


def extract_name(element: Element) -> Optional[str]:
    attr_name = element.get("Name")
    if attr_name:
        return attr_name.strip() or None

    name_elem = find_child(element, "Name")
    if name_elem is not None:
        return element_text(name_elem)
    return None


def extract_description(element: Element) -> Optional[str]:
    attr_desc = element.get("Description")
    if attr_desc:
        return attr_desc.strip() or None

    desc_elem = find_child(element, "Description")
    if desc_elem is not None:
        return element_text(desc_elem)
    return None


def extract_tag(element: Element) -> Optional[str]:
    attr_tag = element.get("Tag")
    if attr_tag:
        return attr_tag.strip() or None

    tag_elem = find_child(element, "Tag")
    if tag_elem is not None:
        return element_text(tag_elem)
    return None


def extract_reference(element: Element) -> Optional[str]:
    href = element.get("href")
    if href:
        return href.lstrip("#")

    ref = element.get("ref")
    if ref:
        return ref.lstrip("#")

    xml_id = extract_xml_id(element)
    if xml_id and element.get("href") is None:
        # L'id du nœud lui-même n'est pas un pointeur, sauf s'il n'a pas d'enfants.
        # Préférer href/ref ; ignorer son propre id.
        pass

    for child in element:
        nested = extract_reference(child)
        if nested:
            return nested
        text = element_text(child)
        if text and len(text) < 80 and " " not in text:
            return text.lstrip("#")

    return None


def collect_references(element: Element) -> List[str]:
    refs: List[str] = []
    seen = set()
    for node in element.iter():
        for attr in ("href", "ref"):
            val = node.get(attr)
            if val:
                cleaned = val.lstrip("#")
                if cleaned not in seen:
                    seen.add(cleaned)
                    refs.append(cleaned)
    return refs


def get_ifc_type(element: Element) -> str:
    return local_name(element)


def is_hierarchy_entity(ifc_type: str) -> bool:
    return ifc_type in HIERARCHY_TYPES


def is_element_entity(ifc_type: str) -> bool:
    return ifc_type in ELEMENT_TYPES or ifc_type.startswith("IfcBuildingElement")


def _unwrap_value(node: Optional[Element]) -> Any:
    if node is None:
        return None
    children = list(node)
    if not children:
        text = (node.text or "").strip()
        return _coerce_scalar(text) if text else None

    values = []
    for child in children:
        text = element_text(child)
        if text and len(list(child)) == 0:
            values.append(_coerce_scalar(text))
        else:
            nested = _unwrap_value(child)
            if nested is not None:
                values.append(nested)
    if len(values) == 1:
        return values[0]
    return values or None


def _coerce_scalar(text: str) -> Any:
    lowered = text.strip()
    if lowered.lower() in ("true", "t", ".t.", ".true."):
        return True
    if lowered.lower() in ("false", "f", ".f.", ".false."):
        return False
    try:
        if "." in lowered or "e" in lowered.lower():
            return float(lowered.replace(",", "."))
        return int(lowered)
    except ValueError:
        return text.strip()


def extract_property_set(pset_elem: Element) -> Optional[Dict[str, Any]]:
    name = extract_name(pset_elem) or "PropertySet"
    props: Dict[str, Any] = {}

    for node in pset_elem.iter():
        tag = local_name(node)
        if tag not in (
            "IfcPropertySingleValue",
            "IfcPropertyEnumeratedValue",
            "IfcPropertyListValue",
            "IfcPropertyBoundedValue",
            "IfcPropertyReferenceValue",
            "IfcComplexProperty",
        ):
            continue
        prop_name = extract_name(node)
        if not prop_name:
            continue
        value_node = None
        for value_tag in (
            "NominalValue",
            "EnumerationValues",
            "ListValues",
            "UpperBoundValue",
            "PropertyReference",
        ):
            candidate = find_child(node, value_tag)
            if candidate is not None:
                value_node = candidate
                break
        props[prop_name] = _unwrap_value(value_node) if value_node is not None else None

    if not props:
        return None
    return {"name": name, "properties": props}


def extract_quantity_set(qto_elem: Element) -> Optional[Dict[str, Any]]:
    name = extract_name(qto_elem) or "ElementQuantity"
    quantities: Dict[str, Any] = {}

    for node in qto_elem.iter():
        tag = local_name(node)
        if not tag.startswith("IfcQuantity"):
            continue
        q_name = extract_name(node)
        if not q_name:
            continue
        value = None
        unit = None
        value_attrs = (
            "LengthValue",
            "AreaValue",
            "VolumeValue",
            "CountValue",
            "WeightValue",
            "TimeValue",
        )
        # Selon le schéma ifcXML, les valeurs de quantité sont des attributs XML
        # de l'élément IfcQuantity* lui-même (ex. <IfcQuantityLength LengthValue="3.2">).
        for attr_name in value_attrs:
            raw = node.get(attr_name)
            if raw is not None:
                value = _coerce_scalar(raw)
                break
        for child in node:
            child_name = local_name(child)
            if value is None and child_name in value_attrs:
                value = _unwrap_value(child)
            elif child_name == "Unit":
                unit = element_text(child)
        if unit is None:
            if "Length" in tag:
                unit = "m"
            elif "Area" in tag:
                unit = "m²"
            elif "Volume" in tag:
                unit = "m³"
            elif "Weight" in tag:
                unit = "kg"
        quantities[q_name] = {"value": value, "unit": unit or "", "type": tag}

    if not quantities:
        return None
    return {"name": name, "quantities": quantities}


def extract_properties(element: Element) -> Dict[str, Any]:
    psets: Dict[str, Any] = {}
    for node in element.iter():
        if local_name(node) == "IfcPropertySet":
            parsed = extract_property_set(node)
            if parsed:
                psets[parsed["name"]] = parsed["properties"]
    return psets


def extract_quantities(element: Element) -> Dict[str, Any]:
    qtos: Dict[str, Any] = {}
    for node in element.iter():
        if local_name(node) == "IfcElementQuantity":
            parsed = extract_quantity_set(node)
            if parsed:
                qtos[parsed["name"]] = parsed["quantities"]
    return qtos


def _parse_numbers(raw: Any) -> List[float]:
    numbers: List[float] = []
    if isinstance(raw, list):
        for item in raw:
            try:
                numbers.append(float(item))
            except (TypeError, ValueError):
                continue
    elif isinstance(raw, (int, float)):
        numbers = [float(raw)]
    elif isinstance(raw, str):
        for part in raw.replace(",", " ").split():
            try:
                numbers.append(float(part))
            except ValueError:
                continue
    return numbers


def extract_placement(element: Element) -> Optional[Dict[str, Any]]:
    location = None
    rotation = None

    for node in element.iter():
        tag = local_name(node)
        if tag in ("Location", "IfcCartesianPoint") and location is None:
            coord_node = find_desc(node, "Coordinates") or node
            numbers = _parse_numbers(_unwrap_value(coord_node))
            if len(numbers) >= 2:
                location = numbers
        if tag in ("RefDirection", "IfcDirection") and rotation is None:
            ratios_node = find_desc(node, "DirectionRatios")
            ratios = _parse_numbers(_unwrap_value(ratios_node) if ratios_node is not None else None)
            if len(ratios) >= 2:
                rotation = f"{round(math.degrees(math.atan2(ratios[1], ratios[0])))}°"

    if not location:
        return None

    while len(location) < 3:
        location.append(0.0)

    return {
        "x": location[0],
        "y": location[1],
        "z": location[2],
        "rotation": rotation or "0°",
        "unit": "m",
    }


def extract_material(element: Element) -> Optional[Dict[str, Any]]:
    for node in element.iter():
        tag = local_name(node)
        if tag in ("IfcMaterial", "IfcMaterialLayer", "IfcMaterialConstituent"):
            name = extract_name(node)
            if name:
                return {"name": name, "color": material_color(name)}
        if tag == "Material":
            name = element_text(node) or extract_name(node)
            if name:
                return {"name": name, "color": material_color(name)}
    return None


def material_color(name: str) -> str:
    palette = [
        "#9AA5B1", "#C6A26B", "#7C8A99", "#8B6B4A", "#5FA88A",
        "#6B7C8A", "#B08D57", "#A3A8B0", "#D4C4A8", "#4A6FA5",
    ]
    return palette[sum(ord(c) for c in name) % len(palette)]


def merge_psets(target: Dict[str, Any], incoming: Dict[str, Any]) -> Dict[str, Any]:
    result = dict(target or {})
    for name, props in (incoming or {}).items():
        existing = dict(result.get(name) or {})
        existing.update(props or {})
        result[name] = existing
    return result


def merge_qtos(target: Dict[str, Any], incoming: Dict[str, Any]) -> Dict[str, Any]:
    result = dict(target or {})
    for name, qtys in (incoming or {}).items():
        existing = dict(result.get(name) or {})
        existing.update(qtys or {})
        result[name] = existing
    return result


# Candidats de noms de quantité IFC pour une grandeur "canonique" donnée -
# partagés entre report_service.py (export) et quality_service.py (contrôles).
AREA_CANDIDATES = ["NetSideArea", "NetArea", "GrossSideArea", "GrossArea", "Area"]
VOLUME_CANDIDATES = ["NetVolume", "GrossVolume", "Volume"]
WEIGHT_CANDIDATES = ["NetWeight", "GrossWeight", "Weight"]


def flatten_quantities(quantities: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Fusionne tous les jeux de quantités (Qto_*) d'un élément en un seul dict
    nom_quantité -> {value, unit, type}. Le premier jeu rencontré gagne en cas
    de doublon (rare en pratique)."""
    flat: Dict[str, Any] = {}
    for qto_set in (quantities or {}).values():
        for q_name, q_data in (qto_set or {}).items():
            flat.setdefault(q_name, q_data)
    return flat


def flatten_properties(properties: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    flat: Dict[str, Any] = {}
    for pset in (properties or {}).values():
        for p_name, p_value in (pset or {}).items():
            flat.setdefault(p_name, p_value)
    return flat


def pick_quantity_value(flat_quantities: Dict[str, Any], names: List[str]) -> Optional[float]:
    for name in names:
        q = flat_quantities.get(name)
        if q and isinstance(q, dict) and q.get("value") is not None:
            try:
                return round(float(q["value"]), 3)
            except (TypeError, ValueError):
                continue
    return None
