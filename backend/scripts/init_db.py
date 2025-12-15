"""
Script pour initialiser la base de données

Crée les tables et applique les migrations.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import Base, engine

def init_database():
    """Initialise la base de données en créant toutes les tables"""
    print("Création des tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables créées avec succès!")
    print("\n⚠️  Note: Exécutez 'alembic upgrade head' pour appliquer les migrations.")
    print("⚠️  Exécutez 'psql -f migrations/001_enable_rls.sql' pour activer RLS.")

if __name__ == "__main__":
    init_database()





