/**
 * Client API
 * 
 * Client centralisé pour les appels API avec gestion d'erreurs.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Détermination de l'URL de base de l'API
// - En développement (npm run dev): backend sur localhost:8000
// - En production (Docker): backend accessible via le service Docker "backend"
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'http://backend:8000'
    : 'http://localhost:8000');

// Créer une instance axios configurée
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le tenant ID et le token JWT
apiClient.interceptors.request.use((config) => {
  // Ajouter le token JWT si disponible
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Ajouter le tenant ID si disponible
  const tenantId = localStorage.getItem('tenant_id');
  if (tenantId) {
    config.headers = config.headers || {};
    config.headers['X-Tenant-ID'] = tenantId;
  }
  
  return config;
});

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Suppress 401/403 errors for /auth/me when not authenticated (expected behavior)
    const isAuthMeEndpoint = error.config?.url?.includes('/auth/me');
    const isAuthError = error.response?.status === 401 || error.response?.status === 403;
    
    if (isAuthMeEndpoint && isAuthError) {
      // Create a silent error that won't be logged to console
      const silentError = new Error('Not authenticated');
      (silentError as any).response = error.response;
      (silentError as any).config = error.config;
      (silentError as any).isSilent = true;
      (silentError as any).suppressError = true;
      return Promise.reject(silentError);
    }

    // Handle 401 errors - clear session
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('tenant_id');
      }
      return Promise.reject(error);
    }
    
    if (error.response) {
      // Erreur avec réponse du serveur
      const message = (error.response.data as any)?.detail || error.message;
      throw new Error(message);
    } else if (error.request) {
      // Requête envoyée mais pas de réponse
      throw new Error('Pas de réponse du serveur');
    } else {
      // Erreur lors de la configuration de la requête
      throw new Error(error.message);
    }
  }
);

// Types
export interface UploadResponse {
  job_id: string;
  filename: string;
  file_size: number;
  status: string;
  message: string;
}

export interface Job {
  id: string;
  tenant_id: string;
  filename: string;
  file_size: number;
  file_path: string;
  ifc_version: string | null;
  status: string;
  error_message: string | null;
  validation_errors: any[] | null;
  metadata: any;
  created_at: string;
  updated_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  page: number;
  page_size: number;
}

export interface Model {
  id: string;
  job_id: string;
  tenant_id: string;
  name: string | null;
  description: string | null;
  project_guid: string | null;
  statistics: any;
  created_at: string;
}

export interface Element {
  id: string;
  guid: string;
  ifc_type: string;
  name: string | null;
  description: string | null;
  tag: string | null;
  storey_id: string | null;
  space_id: string | null;
}

export interface ElementDetail extends Element {
  properties: any;
  quantities: any;
  attributes: any;
}

export interface ElementListResponse {
  elements: Element[];
  total: number;
  page: number;
  page_size: number;
}

// Fonctions API
export const api = {
  // Upload
  uploadFile: async (file: File): Promise<UploadResponse> => {
    // Ensure auth is ready
    const token = localStorage.getItem('access_token');
    const tenantId = localStorage.getItem('tenant_id');
    
    if (!token || !tenantId) {
      // Try to wait for auth
      try {
        const { waitForAuth } = await import('@/components/TenantInitializer');
        await waitForAuth();
      } catch (error) {
        throw new Error('Authentification requise. Veuillez rafraîchir la page.');
      }
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Get current token and tenant_id (may have been updated by waitForAuth)
    const currentToken = localStorage.getItem('access_token');
    const currentTenantId = localStorage.getItem('tenant_id');
    
    const headers: Record<string, string> = {};
    
    // Add auth headers
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    if (currentTenantId) {
      headers['X-Tenant-ID'] = currentTenantId;
    }
    
    // Don't set Content-Type for FormData - let browser set it with boundary
    // Setting it manually can cause issues
    
    const response = await apiClient.post<UploadResponse>('/upload', formData, {
      headers,
    });
    
    return response.data;
  },

  // Jobs
  getJobs: async (
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      status?: string;
      search?: string;
      sortBy?: 'created_at' | 'filename' | 'status';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<JobListResponse> => {
    const params: any = { page, page_size: pageSize };
    // Le backend ne supporte actuellement que le filtre par statut
    if (filters?.status) params.status = filters.status;
    // search, sortBy et sortOrder sont gérés côté client pour l'instant
    
    const response = await apiClient.get<JobListResponse>('/jobs', { params });
    return response.data;
  },

  getJob: async (jobId: string): Promise<Job> => {
    const response = await apiClient.get<Job>(`/jobs/${jobId}`);
    return response.data;
  },

  // Models
  getModels: async (page: number = 1, pageSize: number = 20): Promise<Model[]> => {
    const response = await apiClient.get<Model[]>('/models', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  },

  getModel: async (modelId: string): Promise<Model> => {
    const response = await apiClient.get<Model>(`/models/${modelId}`);
    return response.data;
  },

  // Elements
  getElements: async (
    modelId: string,
    page: number = 1,
    pageSize: number = 50,
    filters?: {
      ifc_type?: string;
      storey_id?: string;
      space_id?: string;
    }
  ): Promise<ElementListResponse> => {
    const params: any = { model_id: modelId, page, page_size: pageSize };
    if (filters?.ifc_type) params.ifc_type = filters.ifc_type;
    if (filters?.storey_id) params.storey_id = filters.storey_id;
    if (filters?.space_id) params.space_id = filters.space_id;
    
    const response = await apiClient.get<ElementListResponse>('/elements', { params });
    return response.data;
  },

  getElement: async (elementId: string): Promise<ElementDetail> => {
    const response = await apiClient.get<ElementDetail>(`/elements/${elementId}`);
    return response.data;
  },

  // Authentication
  login: async (email: string, password: string): Promise<{ access_token: string; token_type: string; expires_in: number }> => {
    const response = await apiClient.post('/auth/login', { email, password });
    // Stocker le token
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }
    return response.data;
  },

  register: async (email: string, password: string, fullName: string, tenantId: string): Promise<{ message: string; user_id: string }> => {
    const response = await apiClient.post('/auth/register', {
      email,
      password,
      full_name: fullName,
      tenant_id: tenantId
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<{ id: string; email: string; full_name: string | null; tenant_id: string; is_active: boolean; is_superuser: boolean }> => {
    const response = await apiClient.get('/auth/me');
    // Stocker le tenant_id depuis l'utilisateur
    if (response.data.tenant_id) {
      localStorage.setItem('tenant_id', response.data.tenant_id);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('tenant_id');
  },
};

export default apiClient;

