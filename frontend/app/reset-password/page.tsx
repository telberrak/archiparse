'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (!token) {
      setError('Lien de réinitialisation invalide');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err?.message || 'Lien invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
            A
          </div>
          <span className="text-xl font-semibold text-foreground tracking-tight">Archiparse</span>
        </div>

        <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
          {!token ? (
            <div className="text-center py-2">
              <h1 className="text-lg font-semibold text-foreground mb-2">Lien invalide</h1>
              <p className="text-sm text-muted-foreground mb-4">
                Ce lien de réinitialisation est incomplet ou invalide.
              </p>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Demander un nouveau lien
              </Link>
            </div>
          ) : done ? (
            <div className="text-center py-2">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <h1 className="text-lg font-semibold text-foreground mb-2">Mot de passe mis à jour</h1>
              <p className="text-sm text-muted-foreground">Redirection vers la connexion…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-foreground mb-1">Nouveau mot de passe</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Choisissez un nouveau mot de passe pour votre compte.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Nouveau mot de passe
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    placeholder="8 caractères minimum"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Confirmer le mot de passe
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Enregistrement…' : 'Réinitialiser le mot de passe'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
