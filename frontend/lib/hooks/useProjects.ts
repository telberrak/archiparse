/**
 * Hook pour gérer les projets
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Project, ProjectInput } from '../api';
import { useAuthReady } from './useAuthReady';

export function useProjects(clientId?: string, statusFilter: 'active' | 'deleted' = 'active') {
  const authReady = useAuthReady();

  return useQuery<Project[]>({
    queryKey: ['projects', clientId, statusFilter],
    queryFn: () => api.getProjects(clientId, statusFilter),
    enabled: authReady,
  });
}

export function useProject(projectId: string) {
  const authReady = useAuthReady();

  return useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: () => api.getProject(projectId),
    enabled: authReady && !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (project: ProjectInput) => api.createProject(project),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, project }: { projectId: string; project: Partial<Omit<ProjectInput, 'client_id'>> }) =>
      api.updateProject(projectId, project),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => api.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}

export function useRestoreProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => api.restoreProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });
}
