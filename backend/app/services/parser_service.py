"""
Service de parsing IFCXML en streaming

Parse les fichiers IFCXML et extrait les entités, éléments et relations.
"""

from pathlib import Path
from typing import Dict, List, Optional, Set, Any
from uuid import UUID
from lxml import etree
from lxml.etree import _Element as Element
from sqlalchemy.orm import Session

from app.models.database import (
    Model, Element as ElementModel, Relationship, Space, Storey
)
from app.utils.ifc_utils import (
    extract_guid, extract_name, extract_description, extract_tag,
    get_ifc_type, is_hierarchy_entity, is_element_entity,
    extract_properties, extract_quantities, extract_reference
)


class ParserService:
    """Service de parsing IFCXML"""
    
    def __init__(self):
        """Initialise le service"""
        self.guid_to_element_id: Dict[UUID, UUID] = {}  # GUID IFC -> ID DB
        self.references_to_resolve: List[Dict] = []  # Références à résoudre plus tard
    
    def parse_file(
        self,
        xml_file_path: Path,
        model_id: UUID,
        tenant_id: UUID,
        db: Session
    ) -> Dict[str, int]:
        """
        Parse un fichier IFCXML et stocke les données dans la base.
        
        Args:
            xml_file_path: Chemin vers le fichier XML
            model_id: ID du modèle dans la base
            tenant_id: ID du locataire
            db: Session de base de données
            
        Returns:
            Dictionnaire avec statistiques (nombre d'éléments, espaces, etc.)
        """
        stats = {
            "elements": 0,
            "spaces": 0,
            "storeys": 0,
            "relationships": 0,
            "project_guid": None
        }
        
        # Réinitialiser les caches
        self.guid_to_element_id.clear()
        self.references_to_resolve.clear()
        
        # Parser en streaming
        context = etree.iterparse(
            str(xml_file_path),
            events=("end",),
            huge_tree=True
        )
        
        # Première passe: extraire les entités de hiérarchie et les éléments
        for event, elem in context:
            ifc_type = get_ifc_type(elem)
            
            # Parser les entités de hiérarchie
            if is_hierarchy_entity(ifc_type):
                self._parse_hierarchy_entity(
                    elem, ifc_type, model_id, tenant_id, db, stats
                )
            
            # Parser les éléments
            elif is_element_entity(ifc_type):
                self._parse_element(
                    elem, ifc_type, model_id, tenant_id, db, stats
                )
            
            # Nettoyer pour libérer la mémoire
            elem.clear()
            while elem.getprevious() is not None:
                del elem.getparent()[0]
        
        # Deuxième passe: résoudre les relations
        self._resolve_relationships(xml_file_path, model_id, tenant_id, db, stats)
        
        return stats
    
    def _parse_hierarchy_entity(
        self,
        element: Element,
        ifc_type: str,
        model_id: UUID,
        tenant_id: UUID,
        db: Session,
        stats: Dict
    ):
        """Parse une entité de hiérarchie (Project, Site, Building, Storey, Space)"""
        guid = extract_guid(element)
        if not guid:
            return
        
        name = extract_name(element)
        description = extract_description(element)
        
        # Créer l'élément de base
        element_db = ElementModel(
            model_id=model_id,
            tenant_id=tenant_id,
            guid=guid,
            ifc_type=ifc_type,
            name=name,
            description=description,
            properties=extract_properties(element),
            quantities=extract_quantities(element)
        )
        
        db.add(element_db)
        db.flush()  # Pour obtenir l'ID
        
        # Stocker le mapping GUID -> ID
        self.guid_to_element_id[guid] = element_db.id
        
        # Traitement spécifique par type
        if ifc_type == "IfcProject":
            stats["project_guid"] = guid
            # Mettre à jour le modèle
            model = db.query(Model).filter(Model.id == model_id).first()
            if model:
                model.project_guid = guid
        
        elif ifc_type == "IfcBuildingStorey":
            # Extraire l'élévation si disponible
            elevation = self._extract_elevation(element)
            
            storey = Storey(
                element_id=element_db.id,
                model_id=model_id,
                tenant_id=tenant_id,
                guid=guid,
                name=name,
                elevation=elevation,
                properties=extract_properties(element),
                quantities=extract_quantities(element)
            )
            db.add(storey)
            stats["storeys"] += 1
        
        elif ifc_type == "IfcSpace":
            # Extraire le numéro de pièce
            number = extract_tag(element)
            
            space = Space(
                element_id=element_db.id,
                model_id=model_id,
                tenant_id=tenant_id,
                guid=guid,
                name=name,
                number=number,
                properties=extract_properties(element),
                quantities=extract_quantities(element)
            )
            db.add(space)
            stats["spaces"] += 1
        
        stats["elements"] += 1
    
    def _parse_element(
        self,
        element: Element,
        ifc_type: str,
        model_id: UUID,
        tenant_id: UUID,
        db: Session,
        stats: Dict
    ):
        """Parse un élément de construction"""
        guid = extract_guid(element)
        if not guid:
            return
        
        name = extract_name(element)
        description = extract_description(element)
        tag = extract_tag(element)
        
        # Extraire les relations de hiérarchie (seront résolues plus tard)
        storey_ref = self._extract_storey_reference(element)
        space_ref = self._extract_space_reference(element)
        
        element_db = ElementModel(
            model_id=model_id,
            tenant_id=tenant_id,
            guid=guid,
            ifc_type=ifc_type,
            name=name,
            description=description,
            tag=tag,
            properties=extract_properties(element),
            quantities=extract_quantities(element),
            attributes=self._extract_attributes(element)
        )
        
        db.add(element_db)
        db.flush()
        
        # Stocker le mapping
        self.guid_to_element_id[guid] = element_db.id
        
        # Stocker les références à résoudre
        if storey_ref or space_ref:
            self.references_to_resolve.append({
                "element_id": element_db.id,
                "storey_ref": storey_ref,
                "space_ref": space_ref
            })
        
        stats["elements"] += 1
    
    def _extract_elevation(self, element: Element) -> Optional[float]:
        """Extrait l'élévation d'un niveau"""
        elevation_elem = element.find(".//{*}Elevation")
        if elevation_elem is not None and elevation_elem.text:
            try:
                return float(elevation_elem.text.strip())
            except (ValueError, AttributeError):
                pass
        return None
    
    def _extract_storey_reference(self, element: Element) -> Optional[UUID]:
        """Extrait la référence au niveau (Storey)"""
        # Chercher dans ContainedInStructure
        contained_in = element.find(".//{*}ContainedInStructure")
        if contained_in is not None:
            ref = extract_reference(contained_in)
            if ref:
                try:
                    return UUID(ref)
                except ValueError:
                    pass
        return None
    
    def _extract_space_reference(self, element: Element) -> Optional[UUID]:
        """Extrait la référence à l'espace (Space)"""
        # Chercher dans ContainedInStructure ou BoundedBy
        # Pour l'instant, on cherche dans les relations
        # Ce sera complété dans la résolution des relations
        return None
    
    def _extract_attributes(self, element: Element) -> Dict[str, Any]:
        """Extrait les attributs bruts de l'élément"""
        attributes = {}
        
        # Extraire les attributs directs (non référencés)
        for child in element:
            if child.tag and "}" in child.tag:
                tag_name = child.tag.split("}")[1]
                if child.text and child.text.strip():
                    attributes[tag_name] = child.text.strip()
        
        return attributes
    
    def _resolve_relationships(
        self,
        xml_file_path: Path,
        model_id: UUID,
        tenant_id: UUID,
        db: Session,
        stats: Dict
    ):
        """Résout les relations entre éléments"""
        # Résoudre les références de hiérarchie stockées
        for ref_data in self.references_to_resolve:
            element_id = ref_data["element_id"]
            storey_ref = ref_data.get("storey_ref")
            
            if storey_ref and storey_ref in self.guid_to_element_id:
                storey_element_id = self.guid_to_element_id[storey_ref]
                # Trouver le storey dans la table storeys
                storey = db.query(Storey).filter(
                    Storey.element_id == storey_element_id
                ).first()
                
                if storey:
                    element = db.query(ElementModel).filter(
                        ElementModel.id == element_id
                    ).first()
                    if element:
                        element.storey_id = storey.element_id
        
        # Parser les relations explicites (IfcRelContainedInSpatialStructure, etc.)
        context = etree.iterparse(
            str(xml_file_path),
            events=("end",),
            huge_tree=True,
            tag=lambda x: x and (
                "IfcRelContainedInSpatialStructure" in x or
                "IfcRelAggregates" in x or
                "IfcRelVoidsElement" in x or
                "IfcRelFillsElement" in x
            )
        )
        
        for event, elem in context:
            self._parse_relationship(elem, model_id, tenant_id, db, stats)
            elem.clear()
            while elem.getprevious() is not None:
                del elem.getparent()[0]
    
    def _parse_relationship(
        self,
        element: Element,
        model_id: UUID,
        tenant_id: UUID,
        db: Session,
        stats: Dict
    ):
        """Parse une relation IFC"""
        ifc_type = get_ifc_type(element)
        
        # Déterminer le type de relation
        relationship_type = "CONTAINS"
        if "Aggregates" in ifc_type:
            relationship_type = "AGGREGATES"
        elif "Voids" in ifc_type:
            relationship_type = "VOIDS"
        elif "Fills" in ifc_type:
            relationship_type = "FILLS"
        
        # Extraire les références
        relating_obj = element.find(".//{*}RelatingObject")
        related_objs = element.findall(".//{*}RelatedObjects//{*}Entity")
        
        if not relating_obj or not related_objs:
            return
        
        from_ref = extract_reference(relating_obj)
        if not from_ref:
            return
        
        try:
            from_guid = UUID(from_ref)
        except ValueError:
            return
        
        if from_guid not in self.guid_to_element_id:
            return
        
        from_element_id = self.guid_to_element_id[from_guid]
        
        # Créer les relations pour chaque objet lié
        for related_obj in related_objs:
            to_ref = extract_reference(related_obj)
            if not to_ref:
                continue
            
            try:
                to_guid = UUID(to_ref)
            except ValueError:
                continue
            
            if to_guid not in self.guid_to_element_id:
                continue
            
            to_element_id = self.guid_to_element_id[to_guid]
            
            # Créer la relation
            relationship = Relationship(
                model_id=model_id,
                tenant_id=tenant_id,
                relationship_type=relationship_type,
                from_element_id=from_element_id,
                to_element_id=to_element_id
            )
            
            db.add(relationship)
            stats["relationships"] += 1


# Instance globale du service
parser_service = ParserService()

