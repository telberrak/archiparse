/**
 * Hook pour les informations du locataire courant (nom, logo)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useAuthReady } from './useAuthReady';

export function useCurrentTenant() {
  const authReady = useAuthReady();

  return useQuery({
    queryKey: ['tenant'],
    queryFn: () => api.getCurrentTenant(),
    enabled: authReady,
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => api.updateCurrentTenant(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
    },
  });
}
