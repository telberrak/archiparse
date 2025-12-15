"""
Script pour créer automatiquement un locataire et un utilisateur initial
(sans interaction)

Usage:
    python scripts/create_tenant_auto.py
    python scripts/create_tenant_auto.py --name "Mon Locataire" --email "admin@example.com" --password "motdepasse"
"""

import sys
from pathlib import Path
import argparse

# Ajouter le chemin du projet
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.database import Tenant, User
from app.core.security import get_password_hash
from uuid import uuid4


def create_tenant_and_admin(name="Locataire Principal", slug="principal", 
                           email="admin@example.com", password="admin123"):
    """Crée un locataire et un utilisateur administrateur"""
    db = SessionLocal()
    
    try:
        # Vérifier si le slug existe déjà
        existing_tenant = db.query(Tenant).filter(Tenant.slug == slug).first()
        if existing_tenant:
            print(f"⚠️  Un locataire avec le slug '{slug}' existe déjà!")
            print(f"   ID: {existing_tenant.id}")
            return existing_tenant
        
        # Vérifier si l'email existe déjà
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"⚠️  Un utilisateur avec l'email '{email}' existe déjà!")
            return None
        
        # Créer le locataire
        tenant = Tenant(
            name=name,
            slug=slug,
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
            email=email,
            hashed_password=get_password_hash(password),
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
        print(f"   Email: {email}")
        print(f"   Mot de passe: {password}")
        print("\n💡 Vous pouvez maintenant vous connecter avec ces identifiants.")
        
        return tenant
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Créer un locataire et un utilisateur admin")
    parser.add_argument("--name", default="Locataire Principal", help="Nom du locataire")
    parser.add_argument("--slug", default="principal", help="Slug du locataire")
    parser.add_argument("--email", default="admin@example.com", help="Email de l'administrateur")
    parser.add_argument("--password", default="admin123", help="Mot de passe de l'administrateur")
    
    args = parser.parse_args()
    
    create_tenant_and_admin(
        name=args.name,
        slug=args.slug,
        email=args.email,
        password=args.password
    )





