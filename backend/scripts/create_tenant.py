"""
Script pour créer un locataire et un utilisateur initial

Usage:
    python scripts/create_tenant.py
"""

import sys
from pathlib import Path

# Ajouter le chemin du projet
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.database import Tenant, User
from app.core.security import get_password_hash
from uuid import uuid4


def create_tenant_and_admin():
    """Crée un locataire et un utilisateur administrateur"""
    db = SessionLocal()
    
    try:
        # Demander les informations
        tenant_name = input("Nom du locataire [Locataire Principal]: ").strip() or "Locataire Principal"
        tenant_slug = input("Slug du locataire [principal]: ").strip() or "principal"
        admin_email = input("Email de l'administrateur [admin@example.com]: ").strip() or "admin@example.com"
        admin_password = input("Mot de passe de l'administrateur: ").strip()
        
        if not admin_password:
            print("❌ Le mot de passe est requis!")
            return
        
        # Vérifier si le slug existe déjà
        existing_tenant = db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
        if existing_tenant:
            print(f"❌ Un locataire avec le slug '{tenant_slug}' existe déjà!")
            return
        
        # Vérifier si l'email existe déjà
        existing_user = db.query(User).filter(User.email == admin_email).first()
        if existing_user:
            print(f"❌ Un utilisateur avec l'email '{admin_email}' existe déjà!")
            return
        
        # Créer le locataire
        tenant = Tenant(
            name=tenant_name,
            slug=tenant_slug,
            is_active=True,
            max_file_size=500 * 1024 * 1024,  # 500MB
            max_files_per_month=100,
            max_storage_size=10 * 1024 * 1024 * 1024  # 10GB
        )
        db.add(tenant)
        db.flush()
        
        # Créer l'utilisateur admin
        admin_user = User(
            tenant_id=tenant.id,
            email=admin_email,
            hashed_password=get_password_hash(admin_password),
            full_name="Administrateur",
            is_active=True,
            is_superuser=True
        )
        db.add(admin_user)
        db.commit()
        
        print("\n✅ Locataire et utilisateur créés avec succès!")
        print(f"   Locataire ID: {tenant.id}")
        print(f"   Locataire Slug: {tenant.slug}")
        print(f"   Utilisateur ID: {admin_user.id}")
        print(f"   Email: {admin_email}")
        print("\n💡 Vous pouvez maintenant vous connecter avec ces identifiants.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur: {str(e)}")
    finally:
        db.close()


if __name__ == "__main__":
    create_tenant_and_admin()





