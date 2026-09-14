"""
Service de parsing IFCXML en streaming

Parse les fichiers IFCXML et extrait les entités, éléments et relations.
"""

from pathlib import Path
from typing import Dict, List, Optional, Any
from uuid import UUID
from lxml import etree
from lxml.etree import _Element as Element
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models.database import (
    Model, Element as ElementModel, Relationship, Space, Storey
)
from app.utils.ifc_utils import (
    extract_guid, extract_name, extract_description, extract_tag,
    get_ifc_type, is_hierarchy_entity, is_element_entity,
    extract_properties, extract_quantities, extract_reference,
    extract_xml_id, extract_placement, extract_material,
    extract_property_set, extract_quantity_set, collect_references,
    merge_psets, merge_qtos, parse_guid, material_color, local_name,
)


def _release_if_top_level(elem: Element) -> None:
    """Libère la mémoire d'un élément entièrement traité, façon iterparse en streaming.

    Les instances ifcXML sont plates : chaque entité IfcXxx est un enfant direct
    de la racine <ifcXML>, et les relations/affectations de jeux de propriétés
    référencent les autres entités par id/ref plutôt que de les imbriquer. On ne
    vide/élague les éléments qu'à ce niveau racine (profondeur 1), une fois leur
    propre événement "end" déclenché - vider ou élaguer un *descendant* (ex. un
    <RelatingStructure> à l'intérieur d'un IfcRelContainedInSpatialStructure pas
    encore fermé) supprimerait des données qu'un ancêtre pas encore fermé a
    encore besoin de lire, ce qui vidait silencieusement toute résolution de
    relations et de Psets/Qtos avant ce correctif.
    """
    parent = elem.getparent()
    if parent is None or parent.getparent() is not None:
        return
    elem.clear()
    while elem.getprevious() is not None:
        del parent[0]


class ParserService:
    """Service de parsing IFCXML"""

    def __init__(self):
        self.guid_to_element_id: Dict[UUID, UUID] = {}
        self.xml_id_to_element_id: Dict[str, UUID] = {}
        self.references_to_resolve: List[Dict] = []

    def parse_file(
        self,
        xml_file_path: Path,
        model_id: UUID,
        tenant_id: UUID,
        db: Session
    ) -> Dict[str, int]:
        stats = {
            "elements": 0,
            "spaces": 0,
            "storeys": 0,
            "relationships": 0,
            "project_guid": None,
            "project_name": None,
        }

        self.guid_to_element_id.clear()
        self.xml_id_to_element_id.clear()
        self.references_to_resolve.clear()

        context = etree.iterparse(
            str(xml_file_path),
            events=("end",),
            huge_tree=True
        )

        for event, elem in context:
            ifc_type = get_ifc_type(elem)

            if is_hierarchy_entity(ifc_type):
                self._parse_hierarchy_entity(
                    elem, ifc_type, model_id, tenant_id, db, stats
                )
            elif is_element_entity(ifc_type):
                self._parse_element(
                    elem, ifc_type, model_id, tenant_id, db, stats
                )

            _release_if_top_level(elem)

        self._resolve_relationships(xml_file_path, model_id, tenant_id, db, stats)
        self._resolve_definitions(xml_file_path, db)

        if stats.get("project_name"):
            model = db.query(Model).filter(Model.id == model_id).first()
            if model and (not model.name or model.name.endswith(".ifcxml") or model.name.endswith(".xml")):
                model.name = stats["project_name"]

        return stats

    def _register_element(self, xml_elem: Element, db_id: UUID, guid: Optional[UUID]):
        xml_id = extract_xml_id(xml_elem)
        if xml_id:
            self.xml_id_to_element_id[xml_id] = db_id
        if guid:
            self.guid_to_element_id[guid] = db_id
            self.xml_id_to_element_id[str(guid)] = db_id

    def _lookup_element_id(self, ref: Optional[str]) -> Optional[UUID]:
        if not ref:
            return None
        cleaned = ref.lstrip("#")
        if cleaned in self.xml_id_to_element_id:
            return self.xml_id_to_element_id[cleaned]
        guid = parse_guid(cleaned)
        if guid and guid in self.guid_to_element_id:
            return self.guid_to_element_id[guid]
        return None

    def _element_payload(self, element: Element) -> Dict[str, Any]:
        attributes = self._extract_attributes(element)
        material = extract_material(element)
        if material:
            attributes["material"] = material
        geometry = {}
        placement = extract_placement(element)
        if placement:
            geometry["placement"] = placement
        return {
            "properties": extract_properties(element),
            "quantities": extract_quantities(element),
            "attributes": attributes,
            "geometry": geometry or None,
        }

    def _parse_hierarchy_entity(
        self,
        element: Element,
        ifc_type: str,
        model_id: UUID,
        tenant_id: UUID,
        db: Session,
        stats: Dict
    ):
        guid = extract_guid(element)
        if not guid:
            return

        name = extract_name(element)
        description = extract_description(element)
        payload = self._element_payload(element)

        element_db = ElementModel(
            model_id=model_id,
            tenant_id=tenant_id,
            guid=guid,
            ifc_type=ifc_type,
            name=name,
            description=description,
            properties=payload["properties"],
            quantities=payload["quantities"],
            attributes=payload["attributes"],
            geometry=payload["geometry"],
        )

        db.add(element_db)
        db.flush()
        self._register_element(element, element_db.id, guid)

        if ifc_type == "IfcProject":
            stats["project_guid"] = guid
            stats["project_name"] = name
            model = db.query(Model).filter(Model.id == model_id).first()
            if model:
                model.project_guid = guid
                if name:
                    model.description = description

        elif ifc_type == "IfcBuildingStorey":
            elevation = self._extract_elevation(element)
            storey = Storey(
                element_id=element_db.id,
                model_id=model_id,
                tenant_id=tenant_id,
                guid=guid,
                name=name,
                elevation=elevation,
                properties=payload["properties"],
            )
            db.add(storey)
            stats["storeys"] += 1

        elif ifc_type == "IfcSpace":
            number = extract_tag(element)
            space = Space(
                element_id=element_db.id,
                model_id=model_id,
                tenant_id=tenant_id,
                guid=guid,
                name=name,
                number=number,
                properties=payload["properties"],
                quantities=payload["quantities"],
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
        guid = extract_guid(element)
        if not guid:
            return

        name = extract_name(element)
        description = extract_description(element)
        tag = extract_tag(element)
        payload = self._element_payload(element)

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
            properties=payload["properties"],
            quantities=payload["quantities"],
            attributes=payload["attributes"],
            geometry=payload["geometry"],
        )

        db.add(element_db)
        db.flush()
        self._register_element(element, element_db.id, guid)

        if storey_ref or space_ref:
            self.references_to_resolve.append({
                "element_id": element_db.id,
                "storey_ref": storey_ref,
                "space_ref": space_ref
            })

        stats["elements"] += 1

    def _extract_elevation(self, element: Element) -> Optional[float]:
        # Elevation est un attribut XML de IfcBuildingStorey selon le schéma ifcXML.
        attr_value = element.get("Elevation")
        if attr_value:
            try:
                return float(attr_value.strip())
            except (ValueError, AttributeError):
                pass

        elevation_elem = element.find(".//{*}Elevation")
        if elevation_elem is not None and elevation_elem.text:
            try:
                return float(elevation_elem.text.strip())
            except (ValueError, AttributeError):
                pass
        return None

    def _extract_storey_reference(self, element: Element) -> Optional[str]:
        contained_in = element.find(".//{*}ContainedInStructure")
        if contained_in is not None:
            return extract_reference(contained_in)
        return None

    def _extract_space_reference(self, element: Element) -> Optional[str]:
        return None

    def _extract_attributes(self, element: Element) -> Dict[str, Any]:
        attributes: Dict[str, Any] = {}
        for child in element:
            tag_name = local_name(child)
            if child.text and child.text.strip() and len(list(child)) == 0:
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
        for ref_data in self.references_to_resolve:
            element_id = ref_data["element_id"]
            storey_ref = ref_data.get("storey_ref")
            storey_element_id = self._lookup_element_id(storey_ref)
            if storey_element_id:
                storey = db.query(Storey).filter(
                    Storey.element_id == storey_element_id
                ).first()
                if storey:
                    element = db.query(ElementModel).filter(
                        ElementModel.id == element_id
                    ).first()
                    if element:
                        element.storey_id = storey.element_id

        context = etree.iterparse(
            str(xml_file_path),
            events=("end",),
            huge_tree=True,
        )

        for event, elem in context:
            ifc_type = get_ifc_type(elem)
            if ifc_type in (
                "IfcRelContainedInSpatialStructure",
                "IfcRelAggregates",
                "IfcRelVoidsElement",
                "IfcRelFillsElement",
            ):
                self._parse_relationship(elem, model_id, tenant_id, db, stats)
            _release_if_top_level(elem)

    def _parse_relationship(
        self,
        element: Element,
        model_id: UUID,
        tenant_id: UUID,
        db: Session,
        stats: Dict
    ):
        ifc_type = get_ifc_type(element)

        relationship_type = "CONTAINS"
        relating_node = None
        related_nodes: List[Element] = []

        if "ContainedInSpatialStructure" in ifc_type:
            relationship_type = "CONTAINS"
            relating_node = element.find(".//{*}RelatingStructure")
            related_parent = element.find(".//{*}RelatedElements")
            if related_parent is not None:
                related_nodes = list(related_parent)
        elif "Aggregates" in ifc_type:
            relationship_type = "AGGREGATES"
            relating_node = element.find(".//{*}RelatingObject")
            related_parent = element.find(".//{*}RelatedObjects")
            if related_parent is not None:
                related_nodes = list(related_parent)
        elif "Voids" in ifc_type:
            relationship_type = "VOIDS"
            relating_node = element.find(".//{*}RelatingBuildingElement")
            related_parent = element.find(".//{*}RelatedOpeningElement")
            if related_parent is not None:
                related_nodes = [related_parent]
        elif "Fills" in ifc_type:
            relationship_type = "FILLS"
            relating_node = element.find(".//{*}RelatingOpeningElement")
            related_parent = element.find(".//{*}RelatedBuildingElement")
            if related_parent is not None:
                related_nodes = [related_parent]
        else:
            relating_node = element.find(".//{*}RelatingObject")
            related_parent = element.find(".//{*}RelatedObjects")
            if related_parent is not None:
                related_nodes = list(related_parent)

        if relating_node is None or not related_nodes:
            return

        from_ref = extract_reference(relating_node)
        from_element_id = self._lookup_element_id(from_ref)
        if not from_element_id:
            return

        from_element = db.query(ElementModel).filter(ElementModel.id == from_element_id).first()

        for related_obj in related_nodes:
            to_ref = extract_reference(related_obj)
            to_element_id = self._lookup_element_id(to_ref)
            if not to_element_id:
                continue

            relationship = Relationship(
                model_id=model_id,
                tenant_id=tenant_id,
                relationship_type=relationship_type,
                from_element_id=from_element_id,
                to_element_id=to_element_id
            )
            db.add(relationship)
            stats["relationships"] += 1

            if relationship_type in ("CONTAINS", "AGGREGATES") and from_element:
                to_element = db.query(ElementModel).filter(ElementModel.id == to_element_id).first()
                if not to_element:
                    continue
                if from_element.ifc_type == "IfcBuildingStorey":
                    to_element.storey_id = from_element.id
                    if to_element.ifc_type == "IfcSpace":
                        space = db.query(Space).filter(Space.element_id == to_element.id).first()
                        if space:
                            space.storey_id = from_element.id
                elif from_element.ifc_type == "IfcSpace":
                    to_element.space_id = from_element.id
                elif from_element.ifc_type == "IfcBuilding":
                    to_element.building_id = from_element.id
                elif from_element.ifc_type == "IfcSite":
                    to_element.site_id = from_element.id
                elif from_element.ifc_type == "IfcProject":
                    to_element.project_id = from_element.id

    def _resolve_definitions(self, xml_file_path: Path, db: Session):
        """Attache Psets, quantités et matériaux référencés aux éléments."""
        psets_by_id: Dict[str, Dict[str, Any]] = {}
        qtos_by_id: Dict[str, Dict[str, Any]] = {}
        materials_by_id: Dict[str, Dict[str, Any]] = {}
        prop_rels: List[Dict[str, Any]] = []
        mat_rels: List[Dict[str, Any]] = []

        context = etree.iterparse(
            str(xml_file_path),
            events=("end",),
            huge_tree=True,
        )

        for event, elem in context:
            ifc_type = get_ifc_type(elem)
            xml_id = extract_xml_id(elem)

            if ifc_type == "IfcPropertySet":
                parsed = extract_property_set(elem)
                if parsed and xml_id:
                    psets_by_id[xml_id] = parsed
            elif ifc_type == "IfcElementQuantity":
                parsed = extract_quantity_set(elem)
                if parsed and xml_id:
                    qtos_by_id[xml_id] = parsed
            elif ifc_type == "IfcMaterial":
                name = extract_name(elem) or element_text_safe(elem)
                if xml_id and name:
                    materials_by_id[xml_id] = {"name": name, "color": material_color(name)}
            elif ifc_type == "IfcRelDefinesByProperties":
                related = elem.find(".//{*}RelatedObjects")
                relating = elem.find(".//{*}RelatingPropertyDefinition")
                if related is not None and relating is not None:
                    prop_rels.append({
                        "element_refs": collect_references(related) or [extract_reference(related)],
                        "def_ref": extract_reference(relating),
                    })
            elif ifc_type == "IfcRelAssociatesMaterial":
                related = elem.find(".//{*}RelatedObjects")
                relating = elem.find(".//{*}RelatingMaterial")
                if related is not None and relating is not None:
                    mat_rels.append({
                        "element_refs": collect_references(related) or [extract_reference(related)],
                        "mat_ref": extract_reference(relating),
                    })

            _release_if_top_level(elem)

        for rel in prop_rels:
            definition = None
            def_ref = rel.get("def_ref")
            kind = None
            if def_ref in psets_by_id:
                definition = psets_by_id[def_ref]
                kind = "pset"
            elif def_ref in qtos_by_id:
                definition = qtos_by_id[def_ref]
                kind = "qto"
            if not definition:
                continue

            for ref in rel.get("element_refs") or []:
                element_id = self._lookup_element_id(ref)
                if not element_id:
                    continue
                element = db.query(ElementModel).filter(ElementModel.id == element_id).first()
                if not element:
                    continue
                if kind == "pset":
                    element.properties = merge_psets(
                        element.properties or {},
                        {definition["name"]: definition["properties"]},
                    )
                    flag_modified(element, "properties")
                else:
                    element.quantities = merge_qtos(
                        element.quantities or {},
                        {definition["name"]: definition["quantities"]},
                    )
                    flag_modified(element, "quantities")

        for rel in mat_rels:
            material = materials_by_id.get(rel.get("mat_ref"))
            if not material:
                continue
            for ref in rel.get("element_refs") or []:
                element_id = self._lookup_element_id(ref)
                if not element_id:
                    continue
                element = db.query(ElementModel).filter(ElementModel.id == element_id).first()
                if not element:
                    continue
                attrs = dict(element.attributes or {})
                attrs["material"] = material
                element.attributes = attrs
                flag_modified(element, "attributes")


def element_text_safe(elem: Element) -> Optional[str]:
    parts = [t.strip() for t in elem.itertext() if t and t.strip()]
    return " ".join(parts) if parts else None


parser_service = ParserService()
