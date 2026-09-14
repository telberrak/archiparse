'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useCurrentTenant } from '@/lib/hooks/useTenant';
import { useQueryClient } from '@tanstack/react-query';

export function TenantLogoCard() {
  const { data: tenant, isLoading: tenantLoading } = useCurrentTenant();
  const queryClient = useQueryClient();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tenant) return;
    if (!tenant.has_logo) {
      setLogoUrl(null);
      return;
    }
    setLogoLoading(true);
    api
      .getTenantLogoUrl()
      .then(setLogoUrl)
      .finally(() => setLogoLoading(false));
  }, [tenant?.has_logo]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await api.uploadTenantLogo(file);
      await queryClient.invalidateQueries({ queryKey: ['tenant'] });
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'envoi du logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    setUploading(true);
    setError(null);
    try {
      await api.deleteTenantLogo();
      await queryClient.invalidateQueries({ queryKey: ['tenant'] });
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la suppression du logo');
    } finally {
      setUploading(false);
    }
  };

  const loading = tenantLoading || logoLoading;

  return (
    <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-foreground mb-1">Image de marque</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Ce logo apparaît sur vos rapports exportés (Excel, PDF, DPGF).
      </p>

      {loading ? (
        <div className="h-16 w-40 bg-muted rounded animate-pulse" />
      ) : (
        <div className="flex items-center gap-4">
          <div className="h-16 w-40 border border-dashed border-border rounded-md flex items-center justify-center bg-muted overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo du cabinet" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">Aucun logo</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={handleFileSelect}
              className="hidden"
              id="logo-upload"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Envoi…' : logoUrl ? 'Remplacer' : 'Téléverser un logo'}
            </Button>
            {logoUrl && (
              <Button variant="ghost" size="sm" disabled={uploading} onClick={handleDelete}>
                Supprimer
              </Button>
            )}
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <p className="mt-3 text-xs text-muted-foreground">PNG, JPEG ou SVG — 2 MB maximum.</p>
    </div>
  );
}
