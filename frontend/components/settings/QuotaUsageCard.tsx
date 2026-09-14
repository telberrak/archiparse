'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { api, QuotaUsage } from '@/lib/api';

const formatBytes = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

export function QuotaUsageCard() {
  const [quota, setQuota] = useState<QuotaUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .getQuotaUsage()
      .then(setQuota)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
        <div className="h-24 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (error || !quota) {
    return null;
  }

  return (
    <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-foreground mb-4">Utilisation &amp; quotas</h2>
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1.5 text-sm">
            <span className="text-foreground">Stockage</span>
            <span className="text-muted-foreground">
              {formatBytes(quota.storage.used)} / {formatBytes(quota.storage.max)}
            </span>
          </div>
          <Progress value={quota.storage.used_percent} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5 text-sm">
            <span className="text-foreground">Fichiers ce mois-ci</span>
            <span className="text-muted-foreground">
              {quota.files_per_month.used} / {quota.files_per_month.max}
            </span>
          </div>
          <Progress value={quota.files_per_month.used_percent} />
        </div>

        <div className="flex items-center justify-between text-sm pt-1 border-t border-border">
          <span className="text-muted-foreground">Taille maximale par fichier</span>
          <span className="text-foreground font-medium">{formatBytes(quota.max_file_size)}</span>
        </div>
      </div>
    </div>
  );
}
