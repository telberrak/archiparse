"""
Utilitaires pour le parsing XML

Fonctions utilitaires pour le traitement XML en streaming.
"""

from typing import Optional, Iterator
from pathlib import Path
from lxml import etree
from lxml.etree import _Element as Element


def detect_ifc_version(xml_file_path: Path) -> Optional[str]:
    """
    Détecte la version IFC depuis le namespace XML.
    
    Args:
        xml_file_path: Chemin vers le fichier XML
        
    Returns:
        'IFC2X3' ou 'IFC4' ou None si non détecté
    """
    try:
        # Parser seulement le début du fichier pour obtenir le namespace
        context = etree.iterparse(
            str(xml_file_path),
            events=("start-ns", "start"),
            huge_tree=True
        )
        
        namespaces = {}
        root_element = None
        
        for event, elem in context:
            if event == "start-ns":
                prefix, uri = elem
                namespaces[prefix] = uri
            elif event == "start" and root_element is None:
                root_element = elem
                # On a assez d'info, on peut arrêter
                break
        
        # Nettoyer
        if root_element is not None:
            root_element.clear()
            while root_element.getprevious() is not None:
                del root_element.getparent()[0]
        
        # Détecter la version depuis les namespaces
        # IFC2x3 utilise généralement: http://www.iai-tech.org/ifcXML/IFC2x3/FINAL
        # IFC4 utilise généralement: http://www.buildingsmart-tech.org/ifcXML/IFC4
        for uri in namespaces.values():
            if "ifcXML" in uri.lower():
                if "IFC2x3" in uri or "ifc2x3" in uri.lower():
                    return "IFC2X3"
                elif "IFC4" in uri or "ifc4" in uri.lower():
                    return "IFC4"
        
        # Vérifier aussi l'élément racine
        if root_element is not None:
            tag = root_element.tag
            if "IFC2x3" in tag or "ifc2x3" in tag.lower():
                return "IFC2X3"
            elif "IFC4" in tag or "ifc4" in tag.lower():
                return "IFC4"
        
        return None
        
    except Exception as e:
        # En cas d'erreur, retourner None
        return None


def stream_xml_elements(xml_file_path: Path, element_tag: str) -> Iterator[Element]:
    """
    Stream les éléments XML d'un type donné.
    
    Args:
        xml_file_path: Chemin vers le fichier XML
        element_tag: Tag de l'élément à extraire (ex: 'IfcWall')
        
    Yields:
        Element: Éléments XML correspondants
    """
    context = etree.iterparse(
        str(xml_file_path),
        events=("end",),
        tag=element_tag,
        huge_tree=True
    )
    
    for event, elem in context:
        yield elem
        # Nettoyer pour libérer la mémoire
        elem.clear()
        while elem.getprevious() is not None:
            del elem.getparent()[0]





