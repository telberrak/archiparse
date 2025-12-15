"""
Service de transformation XSLT

Exécute les transformations XSLT 2.0+ avec Saxon-HE pour générer du JSON normalisé.
"""

from pathlib import Path
from typing import Dict, Any, Optional
import json

try:
    from saxonche import PySaxonProcessor
    SAXON_AVAILABLE = True
except ImportError:
    SAXON_AVAILABLE = False
    print("ATTENTION: saxonche non installé. Les transformations XSLT ne fonctionneront pas.")


class XSLTService:
    """Service de transformation XSLT"""
    
    def __init__(self):
        """Initialise le service"""
        self.xslt_dir = Path("xslt")
        self.templates_dir = self.xslt_dir / "templates"
        self.modules_dir = self.xslt_dir / "modules"
        
        # Cache des stylesheets compilés
        self._compiled_stylesheets: Dict[str, Any] = {}
        
        if not SAXON_AVAILABLE:
            raise RuntimeError(
                "saxonche n'est pas installé. "
                "Installez-le avec: pip install saxonche"
            )
    
    def transform_to_json(
        self,
        xml_file_path: Path,
        ifc_version: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transforme un fichier IFCXML en JSON normalisé.
        
        Args:
            xml_file_path: Chemin vers le fichier XML
            ifc_version: Version IFC ('IFC2X3' ou 'IFC4'). Si None, détection automatique.
            
        Returns:
            Dictionnaire JSON normalisé
            
        Raises:
            RuntimeError: Si saxonche n'est pas disponible
            Exception: Si la transformation échoue
        """
        if not SAXON_AVAILABLE:
            raise RuntimeError("saxonche n'est pas disponible")
        
        # Charger le template XSLT
        xslt_path = self.templates_dir / "to-json.xsl"
        if not xslt_path.exists():
            raise FileNotFoundError(f"Template XSLT non trouvé: {xslt_path}")
        
        # Compiler le stylesheet (avec cache)
        stylesheet_key = str(xslt_path)
        if stylesheet_key not in self._compiled_stylesheets:
            self._compiled_stylesheets[stylesheet_key] = self._compile_stylesheet(xslt_path)
        
        stylesheet = self._compiled_stylesheets[stylesheet_key]
        
        # Exécuter la transformation
        try:
            with PySaxonProcessor(license=False) as proc:
                # Charger le document XML source
                xml_doc = proc.parse_xml(xml_file=str(xml_file_path))
                
                # Créer un transformer
                transformer = proc.new_xslt30_processor()
                
                # Exécuter la transformation
                # Utiliser transform_to_string pour obtenir le résultat textuel
                result_str = transformer.transform_to_string(
                    stylesheet_node=stylesheet,
                    source_node=xml_doc
                )
                
                # Parser le JSON résultant
                return json.loads(result_str)
        
        except Exception as e:
            raise Exception(f"Erreur lors de la transformation XSLT: {str(e)}")
    
    def _compile_stylesheet(self, xslt_path: Path) -> Any:
        """
        Compile un stylesheet XSLT.
        
        Args:
            xslt_path: Chemin vers le fichier XSLT
            
        Returns:
            Stylesheet compilé
        """
        with PySaxonProcessor(license=False) as proc:
            xslt_processor = proc.new_xslt30_processor()
            
            # Compiler le stylesheet
            stylesheet = xslt_processor.compile_stylesheet(stylesheet_file=str(xslt_path))
            
            return stylesheet
    
    def clear_cache(self):
        """Vide le cache des stylesheets compilés"""
        self._compiled_stylesheets.clear()


# Instance globale du service (sera None si saxonche n'est pas disponible)
try:
    xslt_service = XSLTService()
except (RuntimeError, ImportError):
    xslt_service = None
    print("ATTENTION: Service XSLT non disponible. Installez saxonche pour l'activer.")

