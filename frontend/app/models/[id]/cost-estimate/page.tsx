'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useModel } from '@/lib/hooks/useModels';
import { useCostEstimate } from '@/lib/hooks/useCostEstimate';
import { translateIfcType } from '@/components/explorer/explorerUtils';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { ArrowLeft, Download } from 'lucide-react';

const formatMAD = (value: number) =>
  `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;

export default function CostEstimatePage() {
  const params = useParams();
  const modelId = params.id as string;
  const { data: model } = useModel(modelId);
  const { data: estimate, isLoading, error } = useCostEstimate(modelId);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadDpgf = async () => {
    setDownloading(true);
    try {
      await api.downloadReport(modelId, 'dpgf', model?.name || undefined);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link href={`/models/${modelId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="w-4 h-4" />
            Retour au modèle
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Métré chiffré</h1>
          <p className="mt-2 text-muted-foreground">{model?.name || 'Modèle'}</p>
        </div>
        {estimate && estimate.lots.some((lot) => lot.line_items.length > 0) && (
          <Button onClick={handleDownloadDpgf} disabled={downloading} className="shrink-0">
            <Download className="w-4 h-4 mr-2" />
            {downloading ? 'Génération…' : 'Télécharger le DPGF'}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <p className="text-red-600">Erreur lors du calcul de l'avant-métré</p>
      ) : !estimate ? null : (
        <div className="space-y-6">
          <div className="bg-accent border border-border rounded-lg p-6 flex items-center justify-between">
            <span className="text-sm font-medium text-accent-foreground">Total estimé</span>
            <span className="text-2xl font-bold text-accent-foreground">
              {formatMAD(estimate.grand_total)}
            </span>
          </div>

          {estimate.lots.every((lot) => lot.line_items.length === 0) ? (
            <div className="text-center py-12 border border-border rounded-lg">
              <p className="text-muted-foreground mb-4">
                Aucun type d'ouvrage de ce modèle n'a de prix renseigné.
              </p>
              <Link href="/pricing">
                <Button variant="outline">Aller au catalogue de prix</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {estimate.lots
                .filter((lot) => lot.line_items.length > 0)
                .map((lot) => (
                  <div key={lot.code} className="overflow-hidden border border-border rounded-lg bg-card">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-accent">
                      <span className="text-sm font-semibold text-accent-foreground">{lot.label}</span>
                      <span className="text-sm font-semibold text-accent-foreground">
                        {formatMAD(lot.subtotal)}
                      </span>
                    </div>
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left">
                          <th className="px-4 py-2.5 font-semibold text-muted-foreground">Désignation</th>
                          <th className="px-4 py-2.5 font-semibold text-muted-foreground">Unité</th>
                          <th className="px-4 py-2.5 font-semibold text-muted-foreground text-right">Quantité</th>
                          <th className="px-4 py-2.5 font-semibold text-muted-foreground text-right">Prix unitaire</th>
                          <th className="px-4 py-2.5 font-semibold text-muted-foreground text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lot.line_items.map((li) => (
                          <tr
                            key={`${li.ifc_type}-${li.label}`}
                            className="border-t border-border/60 hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium">{li.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {translateIfcType(li.ifc_type)} · {li.element_count} élément
                                {li.element_count > 1 ? 's' : ''}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{li.unit}</td>
                            <td className="px-4 py-3 text-right">{li.quantity.toLocaleString('fr-FR')}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {formatMAD(li.unit_price)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{formatMAD(li.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border font-semibold bg-muted/30">
                          <td className="px-4 py-2.5" colSpan={4}>
                            Sous-total {lot.label}
                          </td>
                          <td className="px-4 py-2.5 text-right">{formatMAD(lot.subtotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ))}

              <div className="flex items-center justify-between px-4 py-3 border border-border rounded-lg bg-accent">
                <span className="text-sm font-bold text-accent-foreground">Total général</span>
                <span className="text-lg font-bold text-accent-foreground">
                  {formatMAD(estimate.grand_total)}
                </span>
              </div>
            </div>
          )}

          {estimate.unmatched_types.length > 0 && (
            <div className="bg-muted border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Types sans prix renseigné ({estimate.unmatched_types.length})
                </h2>
                <Link href="/pricing" className="text-sm text-primary hover:underline">
                  Compléter le catalogue
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {estimate.unmatched_types.map((u) => (
                  <span
                    key={u.ifc_type}
                    title={u.lot_label}
                    className="text-xs px-2 py-1 rounded-md bg-background border border-border text-muted-foreground"
                  >
                    {translateIfcType(u.ifc_type)} ({u.element_count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
