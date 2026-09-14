'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useModel } from '@/lib/hooks/useModels';
import { useQualityReport, useComplianceReport } from '@/lib/hooks/useModelChecks';
import { translateIfcType } from '@/components/explorer/explorerUtils';
import { ArrowLeft, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export default function ModelChecksPage() {
  const params = useParams();
  const modelId = params.id as string;
  const { data: model } = useModel(modelId);
  const quality = useQualityReport(modelId);
  const compliance = useComplianceReport(modelId);

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <Link href={`/models/${modelId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-4 h-4" />
          Retour au modèle
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Qualité &amp; conformité</h1>
        <p className="mt-2 text-muted-foreground">{model?.name || 'Modèle'}</p>
      </div>

      <div className="space-y-8">
        {/* Qualité d'export */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1">Qualité d'export</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Éléments dont les quantités habituellement attendues pour leur type sont absentes du fichier source.
          </p>
          {quality.isLoading ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : quality.error ? (
            <p className="text-red-600 text-sm">Erreur lors du chargement du contrôle qualité</p>
          ) : !quality.data || quality.data.warnings.length === 0 ? (
            <EmptyState label="Aucune quantité manquante détectée" />
          ) : (
            <WarningList
              items={quality.data.warnings.map((w) => ({
                key: w.element_id,
                message: w.message,
                ifc_type: w.ifc_type,
                storey: w.storey,
              }))}
              count={quality.data.summary.elements_with_warnings}
              checkedCount={quality.data.summary.elements_checked}
            />
          )}
        </section>

        {/* Contrôles réglementaires indicatifs */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1">Contrôles réglementaires indicatifs</h2>
          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4 bg-muted border border-border rounded-md p-3">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Vérifications de bon sens (habitabilité, dimensionnement, vitrage) à seuils indicatifs — pas un
              contrôle de conformité réglementaire certifié. Chaque point signalé est « à vérifier », pas
              automatiquement non conforme.
            </span>
          </div>
          {compliance.isLoading ? (
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : compliance.error ? (
            <p className="text-red-600 text-sm">Erreur lors du chargement du contrôle réglementaire</p>
          ) : !compliance.data || compliance.data.warnings.length === 0 ? (
            <EmptyState label="Aucun point à vérifier détecté" />
          ) : (
            <WarningList
              items={compliance.data.warnings.map((w) => ({
                key: w.element_id || w.rule,
                message: w.message,
                ifc_type: w.ifc_type,
                storey: w.storey,
              }))}
              count={compliance.data.summary.warnings_count}
              checkedCount={compliance.data.summary.elements_checked}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
      <CheckCircle2 className="w-4 h-4 shrink-0" />
      {label}
    </div>
  );
}

function WarningList({
  items,
  count,
  checkedCount,
}: {
  items: { key: string | null; message: string; ifc_type: string; storey: string | null }[];
  count: number;
  checkedCount: number;
}) {
  return (
    <div>
      <div className="text-sm text-muted-foreground mb-3">
        {count} avertissement{count > 1 ? 's' : ''} sur {checkedCount} élément{checkedCount > 1 ? 's' : ''} contrôlé{checkedCount > 1 ? 's' : ''}
      </div>
      <div className="border border-border rounded-lg divide-y divide-border bg-card">
        {items.map((item, idx) => (
          <div key={item.key || idx} className="flex items-start gap-3 px-4 py-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-foreground">{item.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {translateIfcType(item.ifc_type)}
                {item.storey ? ` · ${item.storey}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
