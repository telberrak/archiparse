"""
Utilitaires spécifiques IFC

Fonctions utilitaires pour le traitement des données IFC.
"""

from typing import Optional, Dict, Any
from uuid import UUID
from lxml.etree import _Element as Element


def extract_guid(element: Element) -> Optional[UUID]:
    """
    Extrait le GUID d'un élément IFC.
    
    Args:
        element: Élément XML
        
    Returns:
        UUID ou None si non trouvé
    """
    # Le GUID peut être dans l'attribut id ou dans un sous-élément GlobalId
    guid_str = element.get("id")
    
    if not guid_str:
        # Chercher dans les sous-éléments
        global_id_elem = element.find(".//{*}GlobalId")
        if global_id_elem is not None and global_id_elem.text:
            guid_str = global_id_elem.text.strip()
    
    if guid_str:
        try:
            # Les GUIDs IFC sont au format standard UUID
            return UUID(guid_str)
        except (ValueError, AttributeError):
            return None
    
    return None


def extract_name(element: Element) -> Optional[str]:
    """
    Extrait le nom d'un élément IFC.
    
    Args:
        element: Élément XML
        
    Returns:
        Nom ou None
    """
    name_elem = element.find(".//{*}Name")
    if name_elem is not None and name_elem.text:
        return name_elem.text.strip()
    return None


def extract_description(element: Element) -> Optional[str]:
    """
    Extrait la description d'un élément IFC.
    
    Args:
        element: Élément XML
        
    Returns:
        Description ou None
    """
    desc_elem = element.find(".//{*}Description")
    if desc_elem is not None and desc_elem.text:
        return desc_elem.text.strip()
    return None


def extract_tag(element: Element) -> Optional[str]:
    """
    Extrait le tag/identifiant d'un élément IFC.
    
    Args:
        element: Élément XML
        
    Returns:
        Tag ou None
    """
    tag_elem = element.find(".//{*}Tag")
    if tag_elem is not None and tag_elem.text:
        return tag_elem.text.strip()
    return None


def extract_reference(element: Element) -> Optional[str]:
    """
    Extrait une référence (href ou ref) d'un élément.
    
    Args:
        element: Élément XML
        
    Returns:
        ID de référence ou None
    """
    # Vérifier href d'abord
    href = element.get("href")
    if href:
        # href peut être "#id" ou juste "id"
        return href.lstrip("#")
    
    # Vérifier ref
    ref = element.get("ref")
    if ref:
        return ref
    
    return None


def get_ifc_type(element: Element) -> str:
    """
    Obtient le type IFC d'un élément depuis son tag XML.
    
    Args:
        element: Élément XML
        
    Returns:
        Type IFC (ex: 'IfcWall', 'IfcProject')
    """
    tag = element.tag
    # Enlever le namespace si présent
    if "}" in tag:
        tag = tag.split("}")[1]
    return tag


def is_hierarchy_entity(ifc_type: str) -> bool:
    """
    Vérifie si un type IFC est une entité de hiérarchie.
    
    Args:
        ifc_type: Type IFC
        
    Returns:
        True si c'est une entité de hiérarchie
    """
    hierarchy_types = {
        "IfcProject",
        "IfcSite",
        "IfcBuilding",
        "IfcBuildingStorey",
        "IfcSpace"
    }
    return ifc_type in hierarchy_types


def is_element_entity(ifc_type: str) -> bool:
    """
    Vérifie si un type IFC est un élément de construction.
    
    Args:
        ifc_type: Type IFC
        
    Returns:
        True si c'est un élément
    """
    element_types = {
        "IfcWall",
        "IfcSlab",
        "IfcDoor",
        "IfcWindow",
        "IfcBeam",
        "IfcColumn",
        "IfcRoof",
        "IfcStair",
        "IfcRailing",
        "IfcCurtainWall",
        "IfcPlate",
        "IfcMember",
        "IfcCovering",
        "IfcOpeningElement",
        "IfcBuildingElementProxy"
    }
    return ifc_type in element_types or ifc_type.startswith("IfcBuildingElement")


def extract_properties(element: Element) -> Dict[str, Any]:
    """
    Extrait les Property Sets (Psets) d'un élément.
    
    Args:
        element: Élément XML
        
    Returns:
        Dictionnaire des propriétés
    """
    properties = {}
    
    # Chercher les Property Sets
    # Structure: IsDefinedBy -> IfcRelDefinesByProperties -> RelatingPropertyDefinition -> IfcPropertySet -> HasProperties
    is_defined_by = element.findall(".//{*}IsDefinedBy")
    
    for rel in is_defined_by:
        # Suivre la référence
        ref = extract_reference(rel)
        if not ref:
            continue
        
        # Pour l'instant, on stocke juste la référence
        # Le parsing complet nécessiterait de résoudre toutes les références
        # Ce sera fait dans une passe ultérieure
        if "properties" not in properties:
            properties["property_sets"] = []
        
        properties["property_sets"].append({
            "reference": ref
        })
    
    return properties


def extract_quantities(element: Element) -> Dict[str, Any]:
    """
    Extrait les Quantities (Qto) d'un élément.
    
    Args:
        element: Élément XML
        
    Returns:
        Dictionnaire des quantités
    """
    quantities = {}
    
    # Chercher les Quantities
    # Structure similaire aux Property Sets
    is_defined_by = element.findall(".//{*}IsDefinedBy")
    
    for rel in is_defined_by:
        ref = extract_reference(rel)
        if not ref:
            continue
        
        # Pour l'instant, on stocke juste la référence
        if "quantities" not in quantities:
            quantities["quantity_sets"] = []
        
        quantities["quantity_sets"].append({
            "reference": ref
        })
    
    return quantities





