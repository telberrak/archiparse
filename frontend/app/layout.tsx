import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TenantInitializer } from '@/components/TenantInitializer';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Archiparse — Gestion et exploration de modèles IFC',
  description: 'Importez, validez et explorez vos fichiers IFCXML',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            <TenantInitializer>
              <AppShell>{children}</AppShell>
            </TenantInitializer>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
