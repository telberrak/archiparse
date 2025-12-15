"""
Script pour vérifier l'état de Row-Level Security
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import psycopg2
from app.core.config import settings

def check_rls():
    """Vérifie l'état de RLS sur les tables"""
    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()
    
    # Vérifier RLS
    cur.execute("""
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('jobs', 'models', 'elements', 'relationships', 'spaces', 'storeys', 'audit_logs')
        ORDER BY tablename
    """)
    
    results = cur.fetchall()
    print("État Row-Level Security:")
    print("-" * 40)
    for row in results:
        status = "✅ Activé" if row[1] else "❌ Désactivé"
        print(f"  {row[0]:20} {status}")
    
    # Vérifier les politiques
    cur.execute("""
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename IN ('jobs', 'models', 'elements', 'relationships', 'spaces', 'storeys', 'audit_logs')
        ORDER BY tablename, policyname
    """)
    
    policies = cur.fetchall()
    print("\nPolitiques RLS créées:")
    print("-" * 40)
    if policies:
        for row in policies:
            print(f"  {row[0]:20} {row[1]}")
    else:
        print("  Aucune politique trouvée")
    
    conn.close()

if __name__ == "__main__":
    check_rls()





