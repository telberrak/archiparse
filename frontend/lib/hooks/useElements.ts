/**
 * Hook pour gérer les éléments
 */

import { useQuery } from '@tanstack/react-query';
import { api, ElementListResponse, ElementDetail } from '../api';
import { useAuthReady } from './useAuthReady';

export function useElements(
  modelId: string,
  page: number = 1,
  pageSize: number = 50,
  filters?: {
    ifc_type?: string;
    storey_id?: string;
    space_id?: string;
  }
) {
  const authReady = useAuthReady();
  
  return useQuery<ElementListResponse>({
    queryKey: ['elements', modelId, page, pageSize, filters],
    queryFn: () => api.getElements(modelId, page, pageSize, filters),
    enabled: authReady && !!modelId,
  });
}

export function useElement(elementId: string) {
  const authReady = useAuthReady();
  
  return useQuery<ElementDetail>({
    queryKey: ['element', elementId],
    queryFn: () => api.getElement(elementId),
    enabled: authReady && !!elementId,
  });
}




