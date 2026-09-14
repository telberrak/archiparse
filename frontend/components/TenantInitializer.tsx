'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Pages accessibles sans authentification.
const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];

function isPublicRoute(pathname: string | null): boolean {
  return PUBLIC_ROUTES.some((route) => pathname?.startsWith(route));
}

function hasSession(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(localStorage.getItem('access_token') && localStorage.getItem('tenant_id'));
}

/**
 * Garde d'authentification : redirige vers /login si l'utilisateur n'est pas
 * connecté (sauf sur les pages publiques : login/signup/mot de passe oublié).
 * Ne tente plus de connexion automatique — voir app/login/page.tsx.
 */
export function TenantInitializer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isPublicRoute(pathname)) {
      setReady(true);
      return;
    }

    if (!hasSession()) {
      router.replace('/login');
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Conservé pour compatibilité avec les appelants existants qui attendent
 * que l'authentification soit prête avant un appel API. L'authentification
 * se fait désormais via /login (plus de connexion automatique), donc cette
 * fonction se contente de résoudre immédiatement.
 */
export function waitForAuth(): Promise<void> {
  return Promise.resolve();
}
