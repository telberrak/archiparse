'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { api, PriceImportResult } from '@/lib/api';
import { useImportPriceCatalog } from '@/lib/hooks/usePriceCatalog';
import { ArrowLeft, Download, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function PriceImportPage() {
  const importCatalog = useImportPriceCatalog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [downloading, setDownloading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<PriceImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      await api.downloadPriceImportTemplate();
    } finally {
      setDownloading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSelectedFile(file || null);
    setResult(null);
    setError(null);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setError(null);
    setResult(null);
    try {
      const res = await importCatalog.mutateAsync(selectedFile);
      setResult(res);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'import du fichier");
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au catalogue de prix
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Importer les prix</h1>
        <p className="mt-2 text-muted-foreground">
          Importez en masse votre bordereau de prix existant depuis un fichier Excel, plutôt que
          de saisir chaque prix un par un.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Download className="h-4.5 w-4.5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">1. Téléchargez le modèle</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Le modèle contient une feuille à remplir (Type IFC, Libellé, Unité, Prix unitaire,
                Notes) avec des listes déroulantes, et une feuille de référence listant les 131
                types IFC disponibles.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} disabled={downloading}>
            {downloading ? 'Génération…' : 'Télécharger le modèle Excel'}
          </Button>
        </div>

        <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Upload className="h-4.5 w-4.5" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">2. Importez votre fichier</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Remplissez le modèle avec votre bordereau de prix, puis importez-le ici. Les
                lignes déjà présentes dans votre catalogue (même type IFC et même libellé) seront
                mises à jour ; les autres seront ajoutées.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xlsm"
            onChange={handleFileSelect}
            className="hidden"
            id="price-import-file"
          />
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              Choisir un fichier
            </Button>
            {selectedFile && <span className="text-sm text-muted-foreground">{selectedFile.name}</span>}
          </div>

          <div className="mt-4">
            <Button onClick={handleImport} disabled={!selectedFile || importCatalog.isPending}>
              {importCatalog.isPending ? 'Import en cours…' : 'Importer'}
            </Button>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        {result && (
          <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
            {result.created === 0 && result.updated === 0 ? (
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-semibold text-foreground">
                  Aucun prix importé — toutes les lignes ont été ignorées
                </h2>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-foreground">Résultat de l'import</h2>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 rounded-md bg-muted">
                <div className="text-xs text-muted-foreground">Créés</div>
                <div className="text-xl font-bold text-foreground">{result.created}</div>
              </div>
              <div className="p-3 rounded-md bg-muted">
                <div className="text-xs text-muted-foreground">Mis à jour</div>
                <div className="text-xl font-bold text-foreground">{result.updated}</div>
              </div>
              <div className="p-3 rounded-md bg-muted">
                <div className="text-xs text-muted-foreground">Erreurs</div>
                <div className={`text-xl font-bold ${result.errors.length > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                  {result.errors.length}
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="border border-amber-200 bg-amber-50 rounded-md p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    Lignes ignorées ({result.errors.length})
                  </span>
                </div>
                <ul className="space-y-1 max-h-64 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-amber-800">
                      Ligne {e.row} : {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(result.created > 0 || result.updated > 0) && (
              <div className="mt-4">
                <Link href="/pricing">
                  <Button variant="outline" size="sm">
                    Voir le catalogue de prix
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
