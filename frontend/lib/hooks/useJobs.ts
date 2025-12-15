/**
 * Hook pour gérer les tâches
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Job, JobListResponse } from '../api';
import { useAuthReady } from './useAuthReady';

export function useJobs(
  page: number = 1,
  pageSize: number = 20,
  filters?: {
    status?: string;
    search?: string;
    sortBy?: 'created_at' | 'filename' | 'status';
    sortOrder?: 'asc' | 'desc';
  }
) {
  const authReady = useAuthReady();
  
  return useQuery<JobListResponse>({
    queryKey: ['jobs', page, pageSize, filters],
    queryFn: () => api.getJobs(page, pageSize, filters),
    enabled: authReady, // Only run query when auth is ready
    refetchInterval: 5000, // Rafraîchir toutes les 5 secondes
  });
}

export function useJob(jobId: string) {
  const authReady = useAuthReady();
  
  return useQuery<Job>({
    queryKey: ['job', jobId],
    queryFn: () => api.getJob(jobId),
    enabled: authReady && !!jobId, // Only run query when auth is ready and jobId exists
    refetchInterval: (query) => {
      const job = query.state.data;
      // Rafraîchir toutes les 2 secondes si la tâche n'est pas terminée
      if (job && !['TERMINE', 'ECHOUE'].includes(job.status)) {
        return 2000;
      }
      return false;
    },
  });
}

export function useInvalidateJobs() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };
}



