/**
 * Hook pour gérer les modèles
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Model, Storey } from '../api';
import { useAuthReady } from './useAuthReady';

export function useModels(
  page: number = 1,
  pageSize: number = 20,
  projectId?: string,
  statusFilter: 'active' | 'deleted' = 'active'
) {
  const authReady = useAuthReady();

  return useQuery<Model[]>({
    queryKey: ['models', page, pageSize, projectId, statusFilter],
    queryFn: () => api.getModels(page, pageSize, projectId, statusFilter),
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

export function useRestoreModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (modelId: string) => api.restoreModel(modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (modelId: string) => api.deleteModel(modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useStoreys(modelId: string) {
  const authReady = useAuthReady();

  return useQuery<Storey[]>({
    queryKey: ['storeys', modelId],
    queryFn: () => api.getStoreys(modelId),
    enabled: authReady && !!modelId,
  });
}
