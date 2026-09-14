/**
 * Hook pour gérer les clients (maîtres d'ouvrage)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Client, ClientInput } from '../api';
import { useAuthReady } from './useAuthReady';

export function useClients(statusFilter: 'active' | 'deleted' = 'active') {
  const authReady = useAuthReady();

  return useQuery<Client[]>({
    queryKey: ['clients', statusFilter],
    queryFn: () => api.getClients(statusFilter),
    enabled: authReady,
  });
}

export function useClient(clientId: string) {
  const authReady = useAuthReady();

  return useQuery<Client>({
    queryKey: ['client', clientId],
    queryFn: () => api.getClient(clientId),
    enabled: authReady && !!clientId,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (client: ClientInput) => api.createClient(client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, client }: { clientId: string; client: Partial<ClientInput> }) =>
      api.updateClient(clientId, client),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => api.deleteClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

export function useRestoreClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => api.restoreClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}
