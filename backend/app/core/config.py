"""
Configuration de l'application

Gère la configuration basée sur les variables d'environnement.
"""

from pydantic_settings import BaseSettings
from typing import Optional, Union
from pathlib import Path
import json


class Settings(BaseSettings):
    """Paramètres de l'application"""
    
    # Application
    APP_NAME: str = "Archiparse API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-secret-key-in-production"
    
    # Base de données
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/archiparse"
    DATABASE_ECHO: bool = False
    
    # Stockage de fichiers
    UPLOAD_DIR: Path = Path("uploads")
    MAX_FILE_SIZE: int = 500 * 1024 * 1024  # 500MB
    ALLOWED_EXTENSIONS: set[str] = {".ifcxml", ".xml"}
    
    # Chemins XSD (relatif à la racine du projet)
    XSD_DIR: Optional[str] = None
    XSD_IFC2X3: Optional[str] = None
    XSD_IFC4: Optional[str] = None
    
    def get_xsd_dir(self) -> Path:
        """Retourne le chemin du répertoire XSD"""
        if self.XSD_DIR:
            return Path(self.XSD_DIR)
        # Par défaut, xsd est dans le même répertoire que le code (backend/xsd)
        return Path("xsd")
    
    def get_xsd_ifc2x3(self) -> Path:
        """Retourne le chemin du schéma XSD IFC2X3"""
        if self.XSD_IFC2X3:
            return Path(self.XSD_IFC2X3)
        return self.get_xsd_dir() / "IFC2X3.xsd"
    
    def get_xsd_ifc4(self) -> Path:
        """Retourne le chemin du schéma XSD IFC4"""
        if self.XSD_IFC4:
            return Path(self.XSD_IFC4)
        return self.get_xsd_dir() / "ifcXML4.xsd"
    
    # Redis (pour tâches en arrière-plan)
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS - peut être une liste ou une chaîne JSON
    CORS_ORIGINS: Union[list[str], str] = ["http://localhost:3000", "http://localhost:3001"]
    
    def get_cors_origins(self) -> list[str]:
        """Retourne la liste des origines CORS"""
        if isinstance(self.CORS_ORIGINS, str):
            try:
                return json.loads(self.CORS_ORIGINS)
            except json.JSONDecodeError:
                return [self.CORS_ORIGINS]
        return self.CORS_ORIGINS
    
    # Locataire par défaut (pour développement)
    DEFAULT_TENANT_ID: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Instance globale des paramètres
settings = Settings()

# Créer le répertoire d'upload s'il n'existe pas
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
