'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TenantLogoCard } from '@/components/settings/TenantLogoCard';
import { TenantInfoCard } from '@/components/settings/TenantInfoCard';
import { QuotaUsageCard } from '@/components/settings/QuotaUsageCard';
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

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

  const handleSaveName = async () => {
    setSavingName(true);
    setError(null);
    try {
      const updated = await api.updateCurrentUser(fullName.trim());
      setUser(updated);
      setFullName(updated.full_name || '');
      setSuccess('Nom mis à jour avec succès');
      setEditing(false);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la mise à jour du nom');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess('Mot de passe changé avec succès');
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err?.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    setLoggingOut(true);
    api.logout();
    window.location.href = '/login';
  };

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
      <div className="max-w-2xl">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Utilisateur non trouvé'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Paramètres</h1>
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
                    <Button onClick={handleSaveName} size="sm" disabled={savingName}>
                      {savingName ? 'Enregistrement…' : 'Enregistrer'}
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

        <TenantInfoCard />

        <TenantLogoCard />

        <QuotaUsageCard />

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
              {changingPassword ? (
                <div className="space-y-2 max-w-sm">
                  <Input
                    type="password"
                    placeholder="Mot de passe actuel"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Nouveau mot de passe (8 caractères min.)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Confirmer le nouveau mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
                  <div className="flex gap-2">
                    <Button onClick={handleChangePassword} size="sm" disabled={savingPassword}>
                      {savingPassword ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                    <Button
                      onClick={() => {
                        setChangingPassword(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setPasswordError(null);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-2">
                    Changez votre mot de passe pour sécuriser votre compte
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)}>
                    Changer le mot de passe
                  </Button>
                </>
              )}
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
              <Button variant="outline" size="sm" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? 'Déconnexion…' : 'Se déconnecter'}
              </Button>
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
