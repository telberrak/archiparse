'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isExplorer = /^\/models\/[^/]+$/.test(pathname || '');
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname?.startsWith(route));
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isExplorer) {
    return <div className="h-screen overflow-hidden bg-background">{children}</div>;
  }

  if (isPublicRoute) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/20" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 h-full shadow-xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex md:hidden items-center justify-between h-14 px-4 border-b border-border bg-background shrink-0">
          <span className="font-semibold text-foreground tracking-tight">Archiparse</span>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 -mr-2 text-foreground"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-8 max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
