'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Boxes, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import { Model } from '@/lib/api';

export function ModelCard({ model, onDelete }: { model: Model; onDelete?: (model: Model) => void }) {
  const stats = model.statistics || {};
  const ifcVersion = stats.ifc_version as string | undefined;
  const warningCount =
    (stats.quality_summary?.elements_with_warnings || 0) +
    (stats.compliance_summary?.warnings_count || 0);

  return (
    <Link
      href={`/models/${model.id}`}
      className="group flex flex-col p-5 bg-background border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0">
          <Boxes className="h-[18px] w-[18px]" strokeWidth={2} />
        </div>
        <div className="flex items-center gap-1.5">
          {ifcVersion && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
              {ifcVersion}
            </span>
          )}
          {onDelete && (
            <button
              type="button"
              aria-label="Supprimer le modèle"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(model);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
        {model.name || 'Modèle sans nom'}
      </h3>

      <p className="mt-0.5 text-xs text-muted-foreground truncate">
        {model.client_name && model.project_name ? (
          <>
            {model.client_name} <span className="text-muted-foreground/60">›</span> {model.project_name}
          </>
        ) : (
          <span className="italic">Sans projet</span>
        )}
      </p>

      {stats && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
          <span>{stats.elements ?? 0} éléments</span>
          <span>{stats.spaces ?? 0} espaces</span>
          <span>{stats.storeys ?? 0} niveaux</span>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(model.created_at), { addSuffix: true, locale: fr })}
        </span>
        {warningCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {warningCount} à vérifier
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            OK
          </span>
        )}
      </div>
    </Link>
  );
}
