import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navigation } from '@/components/layout/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TenantInitializer } from '@/components/TenantInitializer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Archiparse - Plateforme SaaS IFCXML',
  description: 'Upload, validation, parsing et exploration de fichiers IFCXML',
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
              <div className="min-h-screen bg-background">
                <Navigation />
                <main className="container mx-auto px-4 py-8">
                  {children}
                </main>
              </div>
            </TenantInitializer>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
