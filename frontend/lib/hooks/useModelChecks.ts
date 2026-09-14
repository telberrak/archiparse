/**
 * Hooks pour les contrôles qualité (quantités manquantes) et réglementaires
 * indicatifs (« à vérifier ») d'un modèle
 */

import { useQuery } from '@tanstack/react-query';
import { api, ComplianceReport, QualityReport } from '../api';
import { useAuthReady } from './useAuthReady';

export function useQualityReport(modelId: string) {
  const authReady = useAuthReady();

  return useQuery<QualityReport>({
    queryKey: ['quality', modelId],
    queryFn: () => api.getQualityReport(modelId),
    enabled: authReady && !!modelId,
  });
}

export function useComplianceReport(modelId: string) {
  const authReady = useAuthReady();

  return useQuery<ComplianceReport>({
    queryKey: ['compliance', modelId],
    queryFn: () => api.getComplianceReport(modelId),
    enabled: authReady && !!modelId,
  });
}
