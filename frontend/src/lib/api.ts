// API Service for ESG Reporting App
// Full-featured API client for all backend endpoints

import { useAppStore } from '../store/appStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2047/api/v1';

// Types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  company?: string;
  role?: string;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  company?: string | null;
  role: string;
  mfaEnabled?: boolean;
  mfaRecommended?: boolean;
}

export type LoginResponse =
  | {
      mfaRequired: true;
      mfaToken: string;
      user: Pick<AuthUser, 'id' | 'email' | 'name' | 'role'>;
    }
  | {
      mfaRequired?: false;
      user: AuthUser;
      token: string;
      refreshToken?: string;
    };

interface AuthResponse {
  user: AuthUser;
  token: string;
  refreshToken?: string;
}

export interface MeProfile extends AuthUser {
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
}

export interface ProjectMember {
  id: string;
  email: string;
  name: string;
  role: string;
  invitedAt?: string;
  acceptedAt?: string;
}

export interface SecurityAlert {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  description?: string;
  userId?: string;
  projectId?: string;
  details?: unknown;
  ipAddress?: string;
  resolved: boolean;
  createdAt: string;
}

export interface SecuritySummary {
  unresolved: number;
  bySeverity: Record<string, number>;
  failedAuthLast24h: number;
  sensitiveReadsLast24h: number;
}

interface Activity {
  id?: string;
  projectId?: string;
  name: string;
  description?: string;
  scope: 'scope1' | 'scope2' | 'scope3';
  scope3Category?: string;
  activityType: string;
  quantity: number;
  unit: string;
  source?: string;
  tierLevel?: string;
  dataSource?: string;
  dataQualityScore?: string;
}

interface ReportGenerateOptions {
  projectId: string;
  type: string;
  standard?: string;
  format: string;
  startDate?: string;
  endDate?: string;
  options?: Record<string, boolean>;
}

const REQUEST_TIMEOUT_MS = 20000;

function errorText(data: { message?: unknown; error?: unknown }, status: number): string {
  if (typeof data?.message === 'string' && data.message) return data.message;
  if (typeof data?.error === 'string' && data.error) return data.error;
  if (data?.error && typeof data.error === 'object' && 'message' in data.error) {
    const message = (data.error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return `HTTP error! status: ${status}`;
}

type StoredAuth = { token: string | null; refreshToken: string | null };

const readStoredAuth = (): StoredAuth => {
  try {
    const storage = localStorage.getItem('esg-app-storage');
    if (storage) {
      const parsed = JSON.parse(storage);
      return {
        token: parsed.state?.token || null,
        refreshToken: parsed.state?.refreshToken || null,
      };
    }
  } catch {
    return { token: null, refreshToken: null };
  }
  return { token: null, refreshToken: null };
};

const getAuthToken = (): string | null => readStoredAuth().token;

const persistAuthTokens = (token: string, refreshToken?: string) => {
  const store = useAppStore.getState();
  store.setToken(token);
  if (refreshToken) store.setRefreshToken(refreshToken);
  try {
    const storage = localStorage.getItem('esg-app-storage');
    const parsed = storage ? JSON.parse(storage) : { state: {}, version: 0 };
    parsed.state = {
      ...(parsed.state || {}),
      token,
      ...(refreshToken ? { refreshToken } : {}),
    };
    localStorage.setItem('esg-app-storage', JSON.stringify(parsed));
  } catch {
    /* storage unavailable */
  }
};

const clearStoredSession = () => {
  useAppStore.getState().logout();
};

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const { refreshToken } = readStoredAuth();
    if (!refreshToken) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.data?.token) return null;
      persistAuthTokens(data.data.token, data.data.refreshToken);
      return data.data.token as string;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function linkAbortSignal(controller: AbortController, parentSignal?: AbortSignal | null) {
  if (!parentSignal) return;
  if (parentSignal.aborted) {
    controller.abort();
    return;
  }
  parentSignal.addEventListener('abort', () => controller.abort(), { once: true });
}

async function readResponseBody(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return { success: response.ok, message: response.statusText };
  }
  return response.json().catch(() => ({}));
}

function networkErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') return 'Request timed out';
  if (error instanceof Error) return error.message;
  return 'Network error occurred';
}

async function unauthorizedResponse<T>(endpoint: string, options: RequestInit): Promise<ApiResponse<T>> {
  const nextToken = await refreshAccessToken();
  if (nextToken) return apiFetch<T>(endpoint, options, 1);
  clearStoredSession();
  return { success: false, error: 'Session expired. Please sign in again.' };
}

async function httpFailure<T>(
  response: Response,
  data: { message?: unknown; error?: unknown },
  isGet: boolean,
  endpoint: string,
  options: RequestInit,
  attempt: number,
): Promise<ApiResponse<T>> {
  if (isGet && response.status >= 500 && attempt === 0) {
    return apiFetch<T>(endpoint, options, attempt + 1);
  }
  return { success: false, error: errorText(data, response.status) };
}

// Base fetch wrapper with auth, timeout, one GET retry, and one 401 refresh
async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  attempt = 0
): Promise<ApiResponse<T>> {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  linkAbortSignal(controller, options.signal);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    const data = await readResponseBody(response);

    if (response.status === 401 && attempt === 0 && !endpoint.startsWith('/auth/')) {
      return unauthorizedResponse<T>(endpoint, options);
    }

    if (!response.ok) {
      return httpFailure<T>(response, data, isGet, endpoint, options, attempt);
    }

    return data;
  } catch (error) {
    if (isGet && attempt === 0) {
      return apiFetch<T>(endpoint, options, attempt + 1);
    }
    return { success: false, error: networkErrorMessage(error) };
  } finally {
    clearTimeout(timer);
  }
}

// Raw fetch for file downloads
async function apiRawFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers: HeadersInit = { ...options.headers };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
}

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> => {
    return apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
  
  register: async (data: RegisterData): Promise<ApiResponse<AuthResponse>> => {
    return apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  getCurrentUser: async (): Promise<ApiResponse<MeProfile>> => {
    return apiFetch<MeProfile>('/auth/me');
  },
  
  refreshToken: async (refreshToken: string): Promise<ApiResponse<{ token: string; refreshToken?: string }>> => {
    return apiFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  changePassword: async (currentPassword: string, newPassword: string) =>
    apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  logout: async () => apiFetch('/auth/logout', { method: 'POST' }),

  verifyMfa: async (mfaToken: string, code: string): Promise<ApiResponse<AuthResponse>> =>
    apiFetch<AuthResponse>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ mfaToken, code }),
    }),

  setupMfa: async (): Promise<ApiResponse<{ secret: string; otpauthUrl: string }>> =>
    apiFetch('/auth/mfa/setup', { method: 'POST' }),

  confirmMfa: async (code: string): Promise<ApiResponse<{ mfaEnabled: boolean; backupCodes: string[] }>> =>
    apiFetch('/auth/mfa/confirm', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  disableMfa: async (password: string, code: string) =>
    apiFetch('/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password, code }),
    }),

  regenerateBackupCodes: async (): Promise<ApiResponse<{ backupCodes: string[] }>> =>
    apiFetch('/auth/mfa/backup-codes', { method: 'POST' }),
};

// Projects API
export const projectsApi = {
  getAll: async () => apiFetch('/projects'),
  getById: async (id: string) => apiFetch(`/projects/${id}`),
  create: async (data: any) => apiFetch('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: async (id: string, data: any) => apiFetch(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: async (id: string) => apiFetch(`/projects/${id}`, {
    method: 'DELETE',
  }),

  getMembers: async (projectId: string): Promise<ApiResponse<ProjectMember[]>> =>
    apiFetch<ProjectMember[]>(`/projects/${projectId}/members`),

  addMember: async (projectId: string, body: { email: string; role: string }) =>
    apiFetch(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateMember: async (projectId: string, memberId: string, body: { role: string }) =>
    apiFetch(`/projects/${projectId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  removeMember: async (projectId: string, memberId: string) =>
    apiFetch(`/projects/${projectId}/members/${memberId}`, { method: 'DELETE' }),
};

export const securityApi = {
  getAlerts: async (params?: { page?: number; limit?: number; resolved?: boolean; severity?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.resolved !== undefined) query.append('resolved', String(params.resolved));
    if (params?.severity) query.append('severity', params.severity);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiFetch<SecurityAlert[]>(`/security/alerts${qs}`);
  },

  getSummary: async (): Promise<ApiResponse<SecuritySummary>> => apiFetch<SecuritySummary>('/security/summary'),

  resolveAlert: async (id: string) =>
    apiFetch(`/security/alerts/${id}/resolve`, { method: 'POST' }),
};

// Activities API
export const activitiesApi = {
  getByProject: async (projectId: string) => apiFetch(`/activities/project/${projectId}`),
  create: async (data: any) => apiFetch('/activities', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createForProject: async (projectId: string, data: any) => apiFetch(`/activities/project/${projectId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: async (id: string, data: any) => apiFetch(`/activities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: async (id: string) => apiFetch(`/activities/${id}`, {
    method: 'DELETE',
  }),
  getSummary: async (projectId: string) => apiFetch(`/activities/project/${projectId}/summary`),
  export: async (projectId: string, format: string = 'csv') => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/activities/project/${projectId}/export?format=${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response;
  },
};

// Calculations API
export const calculationsApi = {
  // Calculate all activities for a project
  calculateAll: async (projectId: string) => apiFetch(`/calculate/project/${projectId}/all`, {
    method: 'POST',
  }),
  // Calculate a specific activity
  calculateActivity: async (projectId: string, activityId: string) => apiFetch(`/calculate/activity/${projectId}/${activityId}`, {
    method: 'POST',
  }),
  // Get project totals (scope 1/2/3 breakdown)
  getTotals: async (projectId: string) => apiFetch(`/calculate/project/${projectId}/totals`),
  // Calculate CFP for project
  calculateCFP: async (projectId: string, options?: any) => apiFetch(`/calculate/project/${projectId}/cfp`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  }),
  // Calculate CFO for project
  calculateCFO: async (projectId: string, options?: any) => apiFetch(`/calculate/project/${projectId}/cfo`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  }),
  // Legacy: calculate (alias for calculateAll)
  calculate: async (projectId: string) => apiFetch(`/calculate/project/${projectId}/all`, {
    method: 'POST',
  }),
  getHistory: async (projectId: string) => apiFetch(`/projects/${projectId}/calculations`),
};

// Reports API
export const reportsApi = {
  // Get all reports for a project
  getByProject: async (projectId: string) => apiFetch(`/reports/project/${projectId}`),

  // Get a single report
  getById: async (id: string) => apiFetch(`/reports/${id}`),

  // Generate a new report
  generate: async (data: ReportGenerateOptions) => apiFetch('/reports/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Delete a report
  delete: async (id: string) => apiFetch(`/reports/${id}`, {
    method: 'DELETE',
  }),

  // Download a report
  download: async (id: string, format: string) => {
    return apiRawFetch(`/reports/${id}/download?format=${format}`);
  },
};

// Emission Factors API
export const emissionFactorsApi = {
  // Search emission factors
  search: async (query: string) => apiFetch(`/emission-factors/search?q=${encodeURIComponent(query)}`),

  // Get all emission factors
  getAll: async (params?: { scope?: string; activityType?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.scope) queryParams.append('scope', params.scope);
    if (params?.activityType) queryParams.append('activityType', params.activityType);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiFetch(`/emission-factors${query}`);
  },

  // Get by ID
  getById: async (id: string) => apiFetch(`/emission-factors/${id}`),

  // Get by scope
  getByScope: async (scope: string) => apiFetch(`/emission-factors/scope/${scope}`),

  // Create custom emission factor
  create: async (data: any) => apiFetch('/emission-factors', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Update emission factor
  update: async (id: string, data: any) => apiFetch(`/emission-factors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Delete emission factor
  delete: async (id: string) => apiFetch(`/emission-factors/${id}`, {
    method: 'DELETE',
  }),

  // Get grid emission factors by region and year
  getGridFactor: async (region: string, year: number) =>
    apiFetch(`/emission-factors/grid/${encodeURIComponent(region)}/${year}`),

  // Lookup emission factor by activity type and unit
  lookup: async (activityType: string, unit: string, scope?: string) =>
    apiFetch('/emission-factors/lookup', {
      method: 'POST',
      body: JSON.stringify({ activityType, unit, scope }),
    }),
};

// Files API
export const filesApi = {
  // Upload a file
  upload: async (file: File, projectId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) formData.append('projectId', projectId);

    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    return response.json();
  },

  listByProject: async (projectId: string) => apiFetch(`/files/project/${projectId}`),

  downloadTemplate: async (format: string) => apiRawFetch(`/files/template/${format}`),

  // Get file info
  getById: async (id: string) => apiFetch(`/files/${id}`),

  // Download a file
  download: async (id: string) => apiRawFetch(`/files/${id}/download`),

  // Parse uploaded file (CSV/Excel)
  parse: async (id: string, options?: { headerRow?: number; sheetName?: string }) =>
    apiFetch(`/files/${id}/parse`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),

  // Delete a file
  delete: async (id: string) => apiFetch(`/files/${id}`, {
    method: 'DELETE',
  }),

  // Import parsed data as activities
  importAsActivities: async (id: string, projectId: string, mappings: Record<string, string>) =>
    apiFetch(`/files/${id}/import`, {
      method: 'POST',
      body: JSON.stringify({ projectId, mappings }),
    }),
};

// Audit Logs API
export const auditLogsApi = {
  getAll: async (params?: { projectId?: string; userId?: string; action?: string; limit?: number }) => {
    if (!params?.projectId) {
      return { success: false, error: 'Select a project to view its audit log.' };
    }
    const queryParams = new URLSearchParams();
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.action) queryParams.append('action', params.action);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiFetch(`/audit-logs/project/${params.projectId}${query}`);
  },

  getByProject: async (projectId: string) => apiFetch(`/audit-logs/project/${projectId}`),
};

// Signatures API
export const signaturesApi = {
  sign: async (
    reportId: string,
    data: { signerName: string; signerTitle: string; signerOrganization: string; signatureType?: string; comments?: string }
  ) =>
    apiFetch('/signatures/sign', {
      method: 'POST',
      body: JSON.stringify({ reportId, signatureType: data.signatureType || 'approval', ...data }),
    }),

  getByProject: async (projectId: string) => apiFetch(`/signatures/project/${projectId}`),

  verify: async (reportId: string) => apiFetch(`/signatures/${reportId}/verify`),
};

// Standards API
export const standardsApi = {
  // Get all supported standards
  getAll: async () => apiFetch('/standards'),

  // Get standard details
  getById: async (standardId: string) => apiFetch(`/standards/${standardId}`),
};

// ESG Goals API
export const goalsApi = {
  // Get all goals for a project
  getAll: async (projectId: string, params?: { status?: string; category?: string; scope?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.scope) queryParams.append('scope', params.scope);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiFetch(`/goals/project/${projectId}${query}`);
  },

  // Get goals summary
  getSummary: async (projectId: string) => apiFetch(`/goals/project/${projectId}/summary`),

  // Get single goal
  getById: async (projectId: string, goalId: string) => apiFetch(`/goals/project/${projectId}/${goalId}`),

  // Create a goal
  create: async (projectId: string, data: any) => apiFetch(`/goals/project/${projectId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Update a goal
  update: async (projectId: string, goalId: string, data: any) => apiFetch(`/goals/project/${projectId}/${goalId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Update goal progress from emissions
  updateProgress: async (projectId: string, goalId: string) => apiFetch(`/goals/project/${projectId}/${goalId}/progress`, {
    method: 'POST',
  }),

  // Bulk update all goals progress
  bulkUpdateProgress: async (projectId: string) => apiFetch(`/goals/project/${projectId}/bulk-progress`, {
    method: 'POST',
  }),

  // Delete a goal
  delete: async (projectId: string, goalId: string) => apiFetch(`/goals/project/${projectId}/${goalId}`, {
    method: 'DELETE',
  }),
};

export const dataSourcesApi = {
  list: async (projectId: string) => apiFetch(`/data-sources/${projectId}`),
  get: async (projectId: string, id: string) => apiFetch(`/data-sources/${projectId}/${id}`),
  create: async (projectId: string, data: Record<string, unknown>) =>
    apiFetch(`/data-sources/${projectId}`, { method: 'POST', body: JSON.stringify(data) }),
  update: async (projectId: string, id: string, data: Record<string, unknown>) =>
    apiFetch(`/data-sources/${projectId}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: async (projectId: string, id: string) =>
    apiFetch(`/data-sources/${projectId}/${id}`, { method: 'DELETE' }),
  sync: async (projectId: string, id: string) =>
    apiFetch(`/data-sources/${projectId}/${id}/sync`, { method: 'POST' }),
  testConnection: async (type: string, config: Record<string, unknown>) =>
    apiFetch('/data-sources/test-connection', {
      method: 'POST',
      body: JSON.stringify({ type, config }),
    }),
};

// Health check
export const healthCheck = async (): Promise<boolean> => {
  try {
    const baseUrl = API_BASE_URL.replace(/\/api\/v1$/, '');
    const response = await fetch(`${baseUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
};

// Export all APIs
export default {
  auth: authApi,
  security: securityApi,
  projects: projectsApi,
  activities: activitiesApi,
  calculations: calculationsApi,
  reports: reportsApi,
  emissionFactors: emissionFactorsApi,
  files: filesApi,
  auditLogs: auditLogsApi,
  signatures: signaturesApi,
  standards: standardsApi,
  goals: goalsApi,
  dataSources: dataSourcesApi,
  healthCheck,
};
