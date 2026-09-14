'use client';

import Link from 'next/link';
import { Upload, ListChecks, Boxes, Banknote, ArrowRight, Layers, AlertTriangle } from 'lucide-react';
import { useModels } from '@/lib/hooks/useModels';
import { useJobs } from '@/lib/hooks/useJobs';
import { ModelCard } from '@/components/models/ModelCard';

const SHORTCUTS = [
  {
    href: '/upload',
    icon: Upload,
    title: 'Importer',
    description: 'Téléversez vos fichiers IFCXML pour traitement',
  },
  {
    href: '/jobs',
    icon: ListChecks,
    title: 'Traitements',
    description: 'Consultez le statut de vos fichiers en traitement',
  },
  {
    href: '/models',
    icon: Boxes,
    title: 'Modèles',
    description: 'Explorez vos modèles IFC parsés',
  },
  {
    href: '/pricing',
    icon: Banknote,
    title: 'Catalogue de prix',
    description: 'Gérez vos prix unitaires pour le métré chiffré',
  },
];

const ACTIVE_JOB_STATUSES = ['EN_ATTENTE', 'VALIDATION', 'PARSING', 'TRANSFORMATION'];

export default function HomePage() {
  const { data: models } = useModels(1, 100);
  const { data: jobsData } = useJobs(1, 100);

  const modelCount = models?.length ?? 0;
  const activeJobCount = jobsData?.jobs.filter((j) => ACTIVE_JOB_STATUSES.includes(j.status)).length ?? 0;
  const totalElements = (models || []).reduce((sum, m) => sum + (m.statistics?.elements || 0), 0);
  const totalWarnings = (models || []).reduce((sum, m) => {
    const s = m.statistics || {};
    return sum + (s.quality_summary?.elements_with_warnings || 0) + (s.compliance_summary?.warnings_count || 0);
  }, 0);

  const recentModels = (models || []).slice(0, 3);

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Tableau de bord
        </h1>
        <p className="mt-2 text-muted-foreground">
          Importez, validez et explorez vos fichiers IFCXML depuis un seul endroit
        </p>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatTile icon={Boxes} label="Modèles" value={modelCount} />
        <StatTile icon={ListChecks} label="Traitements en cours" value={activeJobCount} />
        <StatTile icon={Layers} label="Éléments importés" value={totalElements} />
        <StatTile
          icon={AlertTriangle}
          label="Points à vérifier"
          value={totalWarnings}
          tone={totalWarnings > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Modèles récents */}
      {recentModels.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Modèles récents</h2>
            <Link href="/models" className="text-sm text-primary hover:underline flex items-center gap-1">
              Voir tous les modèles
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentModels.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        </div>
      )}

      {/* Accès rapide */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Accès rapide</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SHORTCUTS.map(({ href, icon: Icon, title, description }) => (
            <Link
              key={href}
              href={href}
              className="group p-6 bg-background border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground mb-4">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-1.5">
                {title}
                <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: typeof Boxes;
  label: string;
  value: number;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className="p-4 bg-background border border-border rounded-xl shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="h-4 w-4" strokeWidth={2} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${tone === 'warning' && value > 0 ? 'text-amber-600' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}
