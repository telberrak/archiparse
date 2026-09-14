'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrentTenant, useUpdateTenant } from '@/lib/hooks/useTenant';

export function TenantInfoCard() {
  const { data: tenant, isLoading } = useCurrentTenant();
  const updateTenant = useUpdateTenant();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant && !editing) setDraft(tenant.name);
  }, [tenant, editing]);

  const handleSave = async () => {
    if (!draft.trim()) {
      setError('Le nom ne peut pas être vide');
      return;
    }
    setError(null);
    try {
      await updateTenant.mutateAsync(draft.trim());
      setEditing(false);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la mise à jour');
    }
  };

  if (isLoading || !tenant) {
    return (
      <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
        <div className="h-10 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-foreground mb-4">Informations du cabinet</h2>
      <label className="block text-sm font-medium text-foreground mb-1">Nom du cabinet / entreprise</label>
      {editing ? (
        <div className="space-y-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Nom du cabinet" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm" disabled={updateTenant.isPending}>
              {updateTenant.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button
              onClick={() => {
                setDraft(tenant.name);
                setError(null);
                setEditing(false);
              }}
              variant="outline"
              size="sm"
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <Input value={tenant.name} disabled className="bg-muted text-muted-foreground cursor-not-allowed" />
          <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="ml-2">
            Modifier
          </Button>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Ce nom apparaît avec votre logo sur les rapports exportés.
      </p>
    </div>
  );
}
