/**
 * Hook pour l'avant-métré chiffré d'un modèle
 */

import { useQuery } from '@tanstack/react-query';
import { api, CostEstimate } from '../api';
import { useAuthReady } from './useAuthReady';

export function useCostEstimate(modelId: string) {
  const authReady = useAuthReady();

  return useQuery<CostEstimate>({
    queryKey: ['cost-estimate', modelId],
    queryFn: () => api.getCostEstimate(modelId),
    enabled: authReady && !!modelId,
  });
}
