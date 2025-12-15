'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  tenant_id: string;
  is_active: boolean;
  is_superuser: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Wait for auth to be ready
        const { waitForAuth } = await import('@/components/TenantInitializer');
        await waitForAuth();
        
        const userData = await api.getCurrentUser();
        setUser(userData);
        setFullName(userData.full_name || '');
        setLoading(false);
      } catch (err: any) {
        setError('Erreur lors du chargement des informations utilisateur');
        setLoading(false);
      }
    };
    loadUser();
  }, []);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Utilisateur non trouvé'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
        <p className="mt-2 text-muted-foreground">
          Gérez vos préférences et informations de compte
        </p>
      </div>

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Informations du compte */}
        <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Informations du compte
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                L'email ne peut pas être modifié
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Nom complet
              </label>
              {editing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Votre nom complet"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        // TODO: Implement update user API endpoint
                        setSuccess('Nom mis à jour avec succès');
                        setEditing(false);
                      }}
                      size="sm"
                    >
                      Enregistrer
                    </Button>
                    <Button
                      onClick={() => {
                        setFullName(user.full_name || '');
                        setEditing(false);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={fullName || 'Non défini'}
                    disabled
                    className="w-full px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground cursor-not-allowed"
                  />
                  <Button
                    onClick={() => setEditing(true)}
                    variant="outline"
                    size="sm"
                    className="ml-2"
                  >
                    Modifier
                  </Button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Statut du compte
              </label>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    user.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.is_active ? 'Actif' : 'Inactif'}
                </span>
                {user.is_superuser && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Administrateur
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sécurité */}
        <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Sécurité
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Mot de passe
              </label>
              <p className="text-sm text-muted-foreground mb-2">
                Changez votre mot de passe pour sécuriser votre compte
              </p>
              <Button variant="outline" size="sm">
                Changer le mot de passe
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Actions
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Déconnectez-vous de votre compte. Vous devrez vous reconnecter pour accéder à nouveau.
              </p>
            </div>
          </div>
        </div>

        {/* Informations système */}
        <div className="bg-muted border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Informations système
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID Utilisateur:</span>
              <span className="font-mono text-foreground">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID Locataire:</span>
              <span className="font-mono text-foreground">{user.tenant_id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

