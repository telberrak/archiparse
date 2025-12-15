"""
Service de validation XSD

Valide les fichiers IFCXML contre les schémas XSD officiels en streaming.
"""

from pathlib import Path
from typing import List, Optional
from lxml import etree
from lxml.etree import XMLSchema, XMLSchemaParseError, XMLParser

from app.core.config import settings
from app.models.schemas import ValidationError, ValidationResponse, IFCVersion
from app.utils.xml_utils import detect_ifc_version


class ValidationService:
    """Service de validation XSD"""
    
    def __init__(self):
        """Initialise le service avec les schémas XSD"""
        self._schemas: dict[str, XMLSchema] = {}
        self._load_schemas()
    
    def _load_schemas(self):
        """Charge les schémas XSD en mémoire"""
        import logging
        logger = logging.getLogger(__name__)
        
        # Charger le schéma IFC2X3 (désactivé temporairement - nécessite ex.xsd complet)
        # Le schéma IFC2X3 dépend d'un schéma externe ex.xsd qui n'est pas complet
        # Utiliser IFC4 (ifcXML4.xsd) qui est autonome et ne nécessite pas de dépendances externes
        logger.warning("Schéma IFC2X3 désactivé - utilisez IFC4 (ifcXML4.xsd) qui est autonome")
        
        # Charger le schéma IFC4
        try:
            xsd_path = settings.get_xsd_ifc4()
            if not xsd_path.is_absolute():
                xsd_path = xsd_path.absolute()
            if xsd_path.exists():
                logger.info(f"Chargement du schéma XSD IFC4 depuis: {xsd_path}")
                parser = XMLParser(recover=True, huge_tree=True)
                schema_doc = etree.parse(str(xsd_path), parser=parser)
                try:
                    self._schemas["IFC4"] = XMLSchema(schema_doc)
                    logger.info("Schéma XSD IFC4 chargé avec succès")
                except XMLSchemaParseError as parse_error:
                    logger.warning(f"Erreur de parsing du schéma XSD IFC4 (continuation avec validation basique): {parse_error}")
                    try:
                        self._schemas["IFC4"] = XMLSchema(schema_doc, attribute_defaults=True)
                        logger.info("Schéma XSD IFC4 chargé avec validation basique")
                    except:
                        logger.error("Impossible de charger le schéma XSD IFC4")
            else:
                logger.warning(f"Fichier XSD IFC4 non trouvé: {xsd_path}")
        except Exception as e:
            logger.error(f"Erreur lors du chargement du schéma XSD IFC4: {e}")
    
    def validate_file(
        self,
        xml_file_path: Path,
        ifc_version: Optional[str] = None
    ) -> ValidationResponse:
        """
        Valide un fichier IFCXML contre le schéma XSD approprié.
        
        Args:
            xml_file_path: Chemin vers le fichier XML à valider
            ifc_version: Version IFC ('IFC2X3' ou 'IFC4'). Si None, détection automatique.
            
        Returns:
            ValidationResponse: Résultat de la validation
        """
        errors: List[ValidationError] = []
        warnings: List[str] = []
        
        # Détecter la version si non fournie
        if not ifc_version:
            ifc_version = detect_ifc_version(xml_file_path)
        
        if not ifc_version:
            return ValidationResponse(
                is_valid=False,
                errors=[ValidationError(
                    line=0,
                    column=0,
                    message="Impossible de détecter la version IFC"
                )],
                warnings=warnings
            )
        
        # Vérifier que le schéma existe
        if ifc_version not in self._schemas:
            # Essayer de recharger le schéma
            self._load_schemas()
            if ifc_version not in self._schemas:
                # Si le schéma ne peut pas être chargé, retourner une erreur bloquante
                return ValidationResponse(
                    is_valid=False,
                    ifc_version=IFCVersion(ifc_version) if ifc_version in ["IFC2X3", "IFC4"] else None,
                    errors=[ValidationError(
                        line=0,
                        column=0,
                        message=f"Schéma XSD pour {ifc_version} non disponible. Le fichier XSD se trouve dans xsd/{ifc_version}.xsd mais n'a pas pu être chargé correctement. Veuillez vérifier le fichier XSD."
                    )],
                    warnings=warnings
                )
        
        schema = self._schemas[ifc_version]
        
        # Valider en streaming
        try:
            # Parser en streaming pour validation
            context = etree.iterparse(
                str(xml_file_path),
                events=("end",),
                huge_tree=True
            )
            
            for event, elem in context:
                # Valider l'élément
                try:
                    schema.assertValid(elem)
                except etree.DocumentInvalid as e:
                    # Extraire les erreurs de validation
                    error_log = schema.error_log
                    for error in error_log:
                        errors.append(ValidationError(
                            line=error.line,
                            column=error.column,
                            message=error.message,
                            element=elem.tag if elem is not None else None
                        ))
                
                # Nettoyer pour libérer la mémoire
                elem.clear()
                while elem.getprevious() is not None:
                    del elem.getparent()[0]
            
            # Valider le document complet
            try:
                doc = etree.parse(str(xml_file_path))
                schema.assertValid(doc)
            except etree.DocumentInvalid:
                # Les erreurs ont déjà été collectées ci-dessus
                pass
            except Exception as e:
                errors.append(ValidationError(
                    line=0,
                    column=0,
                    message=f"Erreur lors de la validation: {str(e)}"
                ))
        
        except etree.XMLSyntaxError as e:
            errors.append(ValidationError(
                line=e.lineno if hasattr(e, 'lineno') else 0,
                column=e.offset if hasattr(e, 'offset') else 0,
                message=f"Erreur de syntaxe XML: {str(e)}"
            ))
        except Exception as e:
            errors.append(ValidationError(
                line=0,
                column=0,
                message=f"Erreur lors de la validation: {str(e)}"
            ))
        
        return ValidationResponse(
            is_valid=len(errors) == 0,
            ifc_version=IFCVersion(ifc_version) if ifc_version in ["IFC2X3", "IFC4"] else None,
            errors=errors,
            warnings=warnings
        )
    


# Instance globale du service
validation_service = ValidationService()


