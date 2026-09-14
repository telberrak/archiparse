'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword(email);
    } catch {
      // Toujours afficher le même message de succès, même en cas d'erreur
      // réseau : on ne veut pas indiquer si l'e-mail existe ou non.
    } finally {
      setLoading(false);
      setSent(true);
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
          {sent ? (
            <div className="text-center py-2">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <h1 className="text-lg font-semibold text-foreground mb-2">Vérifiez votre boîte mail</h1>
              <p className="text-sm text-muted-foreground">
                Si un compte existe pour <strong>{email}</strong>, un lien de réinitialisation vient de
                lui être envoyé. Le lien expire dans 1 heure.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-foreground mb-1">Mot de passe oublié</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Recevez un lien pour réinitialiser votre mot de passe par e-mail.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="vous@cabinet.ma"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Envoi…' : 'Envoyer le lien'}
                </Button>
              </form>
            </>
          )}
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
