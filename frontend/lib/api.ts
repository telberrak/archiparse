/**
 * Client API
 * 
 * Client centralisé pour les appels API avec gestion d'erreurs.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// URL appelée depuis le navigateur : le port 8000 est publié sur l'hôte.
// Ne pas utiliser le hostname Docker "backend" ici (ERR_NAME_NOT_RESOLVED).
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    const url = error.config?.url || '';
    // Auth endpoints themselves can legitimately 401 (wrong password, invalid
    // reset token, ...) as part of normal form validation — never treat that
    // as "session expired" and redirect away from the page showing the form.
    // Note: /auth/me is intentionally NOT in this list — a 401 there always
    // means "not authenticated", and should send the user to /login like any
    // other protected endpoint (it used to be silently suppressed here, back
    // when it was called speculatively by an auto-login probe; that probe no
    // longer exists, so a 401 here is a real "please log in" signal now).
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/signup') ||
      url.includes('/auth/register') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password') ||
      url.includes('/auth/change-password');

    // Session expired or invalid: clear it and send the user to log back in.
    if (error.response?.status === 401 && !isAuthEndpoint) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('tenant_id');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
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
  project_id: string | null;
  project_name: string | null;
  client_id: string | null;
  client_name: string | null;
}

export interface Client {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  project_count: number;
  created_at: string;
  updated_at: string | null;
}

export interface ClientInput {
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface Project {
  id: string;
  client_id: string;
  client_name: string | null;
  name: string;
  description: string | null;
  model_count: number;
  created_at: string;
  updated_at: string | null;
}

export interface ProjectInput {
  client_id: string;
  name: string;
  description?: string | null;
}

export interface Element {
  id: string;
  guid: string;
  ifc_type: string;
  name: string | null;
  description: string | null;
  tag: string | null;
  project_id?: string | null;
  site_id?: string | null;
  building_id?: string | null;
  storey_id: string | null;
  storey_name?: string | null;
  space_id: string | null;
  properties?: any;
  quantities?: any;
  attributes?: any;
  geometry?: any;
  price_catalog_item_id?: string | null;
  effective_price_catalog_item_id?: string | null;
  quantity_override_value?: number | null;
  quantity_override_unit?: string | null;
  cost_quantity?: CostQuantity;
}

export interface CostQuantity {
  price_catalog_item_id: string | null;
  unit: PriceUnit | null;
  resolved_quantity: number | null;
  effective_quantity: number | null;
  is_override_applied: boolean;
  override_ignored: boolean;
}

export interface ElementDetail extends Element {
  properties: any;
  quantities: any;
  attributes: any;
}

export interface Storey {
  id: string;
  guid: string;
  name: string | null;
  elevation: number | null;
}

export interface ElementListResponse {
  elements: Element[];
  total: number;
  page: number;
  page_size: number;
}

export type PriceUnit = 'm²' | 'm³' | 'ml' | 'u';

export interface PriceCatalogItem {
  id: string;
  ifc_type: string;
  label: string;
  unit: PriceUnit;
  unit_price: number;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface PriceCatalogItemInput {
  ifc_type: string;
  label: string;
  unit: PriceUnit;
  unit_price: number;
  notes?: string | null;
}

export interface PriceImportError {
  row: number;
  message: string;
}

export interface PriceImportResult {
  created: number;
  updated: number;
  errors: PriceImportError[];
}

export interface CostLineItem {
  ifc_type: string;
  label: string;
  unit: PriceUnit;
  unit_price: number;
  quantity: number;
  element_count: number;
  total: number;
}

export interface UnmatchedType {
  ifc_type: string;
  element_count: number;
  lot_label: string;
}

export interface CostLot {
  code: string;
  label: string;
  line_items: CostLineItem[];
  subtotal: number;
}

export interface CostEstimate {
  lots: CostLot[];
  unmatched_types: UnmatchedType[];
  grand_total: number;
  currency: string;
}

export interface QualityWarning {
  element_id: string;
  ifc_type: string;
  name: string | null;
  tag: string | null;
  storey: string | null;
  missing: string[];
  message: string;
}

export interface QualityReport {
  warnings: QualityWarning[];
  summary: {
    elements_checked: number;
    elements_with_warnings: number;
    warnings_by_type: Record<string, number>;
  };
}

export interface ComplianceWarning {
  element_id: string | null;
  ifc_type: string;
  name: string | null;
  storey: string | null;
  rule: string;
  message: string;
}

export interface ComplianceReport {
  warnings: ComplianceWarning[];
  summary: {
    elements_checked: number;
    warnings_count: number;
    warnings_by_rule: Record<string, number>;
  };
}

export interface QuotaUsage {
  storage: { used: number; max: number; used_percent: number };
  files_per_month: { used: number; max: number; used_percent: number };
  max_file_size: number;
}

// Fonctions API
export const api = {
  // Upload
  uploadFile: async (file: File, projectId: string): Promise<UploadResponse> => {
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
    formData.append('project_id', projectId);

    // Get current token and tenant_id (may have been updated by waitForAuth)
    const currentToken = localStorage.getItem('access_token');
    const currentTenantId = localStorage.getItem('tenant_id');
    
    const headers: Record<string, string | undefined> = {};

    // Add auth headers
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    if (currentTenantId) {
      headers['X-Tenant-ID'] = currentTenantId;
    }

    // apiClient sets a default 'Content-Type: application/json' header, which
    // does NOT get replaced automatically for FormData bodies and breaks the
    // multipart boundary the backend needs to parse the "file" field (causes
    // a 422 "field required" even though a file was attached). Explicitly
    // unsetting it here lets axios/the browser set the correct
    // multipart/form-data boundary instead.
    headers['Content-Type'] = undefined;

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
  getModels: async (
    page: number = 1,
    pageSize: number = 20,
    projectId?: string,
    statusFilter?: 'active' | 'deleted'
  ): Promise<Model[]> => {
    const response = await apiClient.get<Model[]>('/models', {
      params: {
        page,
        page_size: pageSize,
        ...(projectId ? { project_id: projectId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
    });
    return response.data;
  },

  getModel: async (modelId: string): Promise<Model> => {
    const response = await apiClient.get<Model>(`/models/${modelId}`);
    return response.data;
  },

  restoreModel: async (modelId: string): Promise<Model> => {
    const response = await apiClient.post<Model>(`/models/${modelId}/restore`);
    return response.data;
  },

  deleteModel: async (modelId: string): Promise<void> => {
    await apiClient.delete(`/models/${modelId}`);
  },

  getStoreys: async (modelId: string): Promise<Storey[]> => {
    const response = await apiClient.get<Storey[]>(`/models/${modelId}/storeys`);
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

  assignElementPrice: async (
    elementId: string,
    priceCatalogItemId: string | null
  ): Promise<{ id: string; price_catalog_item_id: string | null; effective_price_catalog_item_id: string | null }> => {
    const response = await apiClient.put(`/elements/${elementId}/price`, {
      price_catalog_item_id: priceCatalogItemId,
    });
    return response.data;
  },

  assignElementQuantityOverride: async (
    elementId: string,
    value: number | null,
    unit: PriceUnit | null
  ): Promise<{ id: string; quantity_override_value: number | null; quantity_override_unit: string | null; cost_quantity: CostQuantity }> => {
    const response = await apiClient.put(`/elements/${elementId}/quantity-override`, { value, unit });
    return response.data;
  },

  // Catalogue de prix (avant-métré chiffré)
  getPriceCatalog: async (ifcType?: string): Promise<PriceCatalogItem[]> => {
    const response = await apiClient.get<PriceCatalogItem[]>('/price-catalog', {
      params: ifcType ? { ifc_type: ifcType } : undefined,
    });
    return response.data;
  },

  createPriceCatalogItem: async (item: PriceCatalogItemInput): Promise<PriceCatalogItem> => {
    const response = await apiClient.post<PriceCatalogItem>('/price-catalog', item);
    return response.data;
  },

  updatePriceCatalogItem: async (
    itemId: string,
    item: Partial<PriceCatalogItemInput>
  ): Promise<PriceCatalogItem> => {
    const response = await apiClient.put<PriceCatalogItem>(`/price-catalog/${itemId}`, item);
    return response.data;
  },

  deletePriceCatalogItem: async (itemId: string): Promise<void> => {
    await apiClient.delete(`/price-catalog/${itemId}`);
  },

  getCostEstimate: async (modelId: string): Promise<CostEstimate> => {
    const response = await apiClient.get<CostEstimate>(`/models/${modelId}/cost-estimate`);
    return response.data;
  },

  downloadPriceImportTemplate: async (): Promise<void> => {
    const response = await apiClient.get('/price-catalog/import-template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modele_import_prix.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  importPriceCatalog: async (file: File): Promise<PriceImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<PriceImportResult>('/price-catalog/import', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  },

  // Clients
  getClients: async (statusFilter?: 'active' | 'deleted'): Promise<Client[]> => {
    const response = await apiClient.get<Client[]>('/clients', {
      params: statusFilter ? { status: statusFilter } : undefined,
    });
    return response.data;
  },

  getClient: async (clientId: string): Promise<Client> => {
    const response = await apiClient.get<Client>(`/clients/${clientId}`);
    return response.data;
  },

  createClient: async (client: ClientInput): Promise<Client> => {
    const response = await apiClient.post<Client>('/clients', client);
    return response.data;
  },

  updateClient: async (clientId: string, client: Partial<ClientInput>): Promise<Client> => {
    const response = await apiClient.put<Client>(`/clients/${clientId}`, client);
    return response.data;
  },

  deleteClient: async (clientId: string): Promise<void> => {
    await apiClient.delete(`/clients/${clientId}`);
  },

  restoreClient: async (clientId: string): Promise<Client> => {
    const response = await apiClient.post<Client>(`/clients/${clientId}/restore`);
    return response.data;
  },

  // Projets
  getProjects: async (clientId?: string, statusFilter?: 'active' | 'deleted'): Promise<Project[]> => {
    const response = await apiClient.get<Project[]>('/projects', {
      params: {
        ...(clientId ? { client_id: clientId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
    });
    return response.data;
  },

  getProject: async (projectId: string): Promise<Project> => {
    const response = await apiClient.get<Project>(`/projects/${projectId}`);
    return response.data;
  },

  restoreProject: async (projectId: string): Promise<Project> => {
    const response = await apiClient.post<Project>(`/projects/${projectId}/restore`);
    return response.data;
  },

  createProject: async (project: ProjectInput): Promise<Project> => {
    const response = await apiClient.post<Project>('/projects', project);
    return response.data;
  },

  updateProject: async (projectId: string, project: Partial<Omit<ProjectInput, 'client_id'>>): Promise<Project> => {
    const response = await apiClient.put<Project>(`/projects/${projectId}`, project);
    return response.data;
  },

  deleteProject: async (projectId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}`);
  },

  // Locataire (image de marque des rapports)
  getCurrentTenant: async (): Promise<{ id: string; name: string; has_logo: boolean }> => {
    const response = await apiClient.get('/tenants/me');
    return response.data;
  },

  updateCurrentTenant: async (name: string): Promise<{ id: string; name: string; has_logo: boolean }> => {
    const response = await apiClient.put('/tenants/me', { name });
    return response.data;
  },

  // Quotas
  getQuotaUsage: async (): Promise<QuotaUsage> => {
    const response = await apiClient.get<QuotaUsage>('/quota/usage');
    return response.data;
  },

  uploadTenantLogo: async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    await apiClient.post('/tenants/me/logo', formData, {
      headers: { 'Content-Type': undefined },
    });
  },

  deleteTenantLogo: async (): Promise<void> => {
    await apiClient.delete('/tenants/me/logo');
  },

  getTenantLogoUrl: async (): Promise<string | null> => {
    try {
      const response = await apiClient.get('/tenants/me/logo', { responseType: 'blob' });
      return window.URL.createObjectURL(response.data);
    } catch {
      return null;
    }
  },

  getQualityReport: async (modelId: string): Promise<QualityReport> => {
    const response = await apiClient.get<QualityReport>(`/models/${modelId}/quality`);
    return response.data;
  },

  getComplianceReport: async (modelId: string): Promise<ComplianceReport> => {
    const response = await apiClient.get<ComplianceReport>(`/models/${modelId}/compliance`);
    return response.data;
  },

  // Rapports
  downloadReport: async (modelId: string, format: 'xlsx' | 'pdf' | 'dpgf', modelName?: string): Promise<void> => {
    const response = await apiClient.get(`/models/${modelId}/report`, {
      params: { format },
      responseType: 'blob',
    });

    const disposition = response.headers['content-disposition'] as string | undefined;
    const match = disposition?.match(/filename="?([^"]+)"?/);
    const fallbackName = (modelName || 'rapport').replace(/[^A-Za-z0-9_-]+/g, '_');
    const fallbackExt = format === 'dpgf' ? 'xlsx' : format;
    const filename = match?.[1] || `${fallbackName}.${fallbackExt}`;

    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
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

  signup: async (
    tenantName: string,
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ access_token: string; token_type: string; expires_in: number }> => {
    const response = await apiClient.post('/auth/signup', {
      tenant_name: tenantName,
      email,
      password,
      full_name: fullName || undefined,
    });
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
    }
    return response.data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, new_password: newPassword });
  },

  getCurrentUser: async (): Promise<{ id: string; email: string; full_name: string | null; tenant_id: string; is_active: boolean; is_superuser: boolean }> => {
    const response = await apiClient.get('/auth/me');
    // Stocker le tenant_id depuis l'utilisateur
    if (response.data.tenant_id) {
      localStorage.setItem('tenant_id', response.data.tenant_id);
    }
    return response.data;
  },

  updateCurrentUser: async (
    fullName: string
  ): Promise<{ id: string; email: string; full_name: string | null; tenant_id: string; is_active: boolean; is_superuser: boolean }> => {
    const response = await apiClient.put('/auth/me', { full_name: fullName });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('tenant_id');
  },
};

export default apiClient;

