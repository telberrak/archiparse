/**
 * Hook pour gérer les modèles
 */

import { useQuery } from '@tanstack/react-query';
import { api, Model } from '../api';
import { useAuthReady } from './useAuthReady';

export function useModels(page: number = 1, pageSize: number = 20) {
  const authReady = useAuthReady();
  
  return useQuery<Model[]>({
    queryKey: ['models', page, pageSize],
    queryFn: () => api.getModels(page, pageSize),
    enabled: authReady,
  });
}

export function useModel(modelId: string) {
  const authReady = useAuthReady();
  
  return useQuery<Model>({
    queryKey: ['model', modelId],
    queryFn: () => api.getModel(modelId),
    enabled: authReady && !!modelId,
  });
}




