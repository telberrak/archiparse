'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import { LayoutDashboard, Users, FolderKanban, Upload, ListChecks, Boxes, Banknote, FileSpreadsheet, Archive, Settings, LogOut } from 'lucide-react';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/projects', label: 'Projets', icon: FolderKanban },
  { href: '/upload', label: 'Importer', icon: Upload },
  { href: '/jobs', label: 'Traitements', icon: ListChecks },
  { href: '/models', label: 'Modèles', icon: Boxes },
  { href: '/pricing', label: 'Catalogue de prix', icon: Banknote },
  { href: '/pricing/import', label: 'Importer les prix', icon: FileSpreadsheet },
  { href: '/archives', label: 'Archives', icon: Archive },
  { href: '/settings', label: 'Paramètres', icon: Settings },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const bestMatch = NAV_ITEMS
    .filter(({ href }) => (href === '/' ? pathname === '/' : pathname?.startsWith(href)))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const isActive = (href: string) => bestMatch?.href === href;

  const handleLogout = () => {
    onNavigate?.();
    api.logout();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center gap-2.5 h-16 px-6 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
          A
        </div>
        <span className="text-lg font-semibold text-sidebar-foreground tracking-tight">
          Archiparse
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={clsx(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              {label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
          Se déconnecter
        </button>
      </nav>
    </div>
  );
}
