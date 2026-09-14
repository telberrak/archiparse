/**
 * Hook pour gérer le catalogue de prix unitaires (avant-métré chiffré)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, PriceCatalogItem, PriceCatalogItemInput, PriceUnit } from '../api';
import { useAuthReady } from './useAuthReady';

export function usePriceCatalog(ifcType?: string) {
  const authReady = useAuthReady();

  return useQuery<PriceCatalogItem[]>({
    queryKey: ['price-catalog', ifcType],
    queryFn: () => api.getPriceCatalog(ifcType),
    enabled: authReady,
  });
}

export function useAssignElementPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ elementId, priceCatalogItemId }: { elementId: string; priceCatalogItemId: string | null }) =>
      api.assignElementPrice(elementId, priceCatalogItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elements'] });
      queryClient.invalidateQueries({ queryKey: ['cost-estimate'] });
    },
  });
}

export function useAssignQuantityOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ elementId, value, unit }: { elementId: string; value: number | null; unit: PriceUnit | null }) =>
      api.assignElementQuantityOverride(elementId, value, unit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elements'] });
      queryClient.invalidateQueries({ queryKey: ['cost-estimate'] });
    },
  });
}

export function useCreatePriceCatalogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: PriceCatalogItemInput) => api.createPriceCatalogItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-catalog'] });
    },
  });
}

export function useUpdatePriceCatalogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, item }: { itemId: string; item: Partial<PriceCatalogItemInput> }) =>
      api.updatePriceCatalogItem(itemId, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-catalog'] });
    },
  });
}

export function useDeletePriceCatalogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => api.deletePriceCatalogItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-catalog'] });
    },
  });
}

export function useImportPriceCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => api.importPriceCatalog(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-catalog'] });
    },
  });
}
