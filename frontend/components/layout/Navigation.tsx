'use client';

import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-primary border-b border-primary/20 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <a href="/" className="text-2xl font-bold text-primary-foreground hover:opacity-90 transition-opacity">
            Archiparse
          </a>
          <div className="flex items-center gap-6">
            <div className="flex gap-4">
              <a
                href="/"
                className={`text-primary-foreground/90 hover:text-primary-foreground transition-colors font-medium ${
                  pathname === '/' ? 'text-primary-foreground underline' : ''
                }`}
              >
                Accueil
              </a>
              <a
                href="/upload"
                className={`text-primary-foreground/90 hover:text-primary-foreground transition-colors font-medium ${
                  pathname === '/upload' ? 'text-primary-foreground underline' : ''
                }`}
              >
                Upload
              </a>
              <a
                href="/jobs"
                className={`text-primary-foreground/90 hover:text-primary-foreground transition-colors font-medium ${
                  pathname === '/jobs' ? 'text-primary-foreground underline' : ''
                }`}
              >
                Tâches
              </a>
              <a
                href="/models"
                className={`text-primary-foreground/90 hover:text-primary-foreground transition-colors font-medium ${
                  pathname === '/models' ? 'text-primary-foreground underline' : ''
                }`}
              >
                Modèles
              </a>
            </div>
            <div className="flex items-center gap-4 border-l border-primary-foreground/20 pl-4">
              <a
                href="/settings"
                className={`text-primary-foreground/90 hover:text-primary-foreground transition-colors font-medium text-sm ${
                  pathname === '/settings' ? 'text-primary-foreground underline' : ''
                }`}
              >
                Paramètres
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
