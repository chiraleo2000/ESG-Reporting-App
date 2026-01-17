// API Service for ESG Reporting App
// Full-featured API client for all backend endpoints

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

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    company: string | null;
    role: string;
  };
  token: string;
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

// Helper to get auth token from localStorage
const getAuthToken = (): string | null => {
  try {
    const storage = localStorage.getItem('esg-app-storage');
    if (storage) {
      const parsed = JSON.parse(storage);
      return parsed.state?.token || null;
    }
  } catch {
    return null;
  }
  return null;
};

// Base fetch wrapper with auth
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `HTTP error! status: ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
    };
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
  login: async (credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> => {
    return apiFetch<AuthResponse>('/auth/login', {
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
  
  getCurrentUser: async (): Promise<ApiResponse<{ user: AuthResponse['user'] }>> => {
    return apiFetch('/auth/me');
  },
  
  refreshToken: async (refreshToken: string): Promise<ApiResponse<{ token: string }>> => {
    return apiFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },
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
  calculateAll: async (projectId: string) => apiFetch(`/calculations/project/${projectId}/all`, {
    method: 'POST',
  }),
  // Calculate a specific activity
  calculateActivity: async (projectId: string, activityId: string) => apiFetch(`/calculations/activity/${projectId}/${activityId}`, {
    method: 'POST',
  }),
  // Get project totals (scope 1/2/3 breakdown)
  getTotals: async (projectId: string) => apiFetch(`/calculations/project/${projectId}/totals`),
  // Calculate CFP for project
  calculateCFP: async (projectId: string, options?: any) => apiFetch(`/calculations/project/${projectId}/cfp`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  }),
  // Calculate CFO for project
  calculateCFO: async (projectId: string, options?: any) => apiFetch(`/calculations/project/${projectId}/cfo`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  }),
  // Legacy: calculate (alias for calculateAll)
  calculate: async (projectId: string) => apiFetch(`/calculations/project/${projectId}/all`, {
    method: 'POST',
  }),
  getHistory: async (projectId: string) => apiFetch(`/calculations/project/${projectId}/history`),
};

// Reports API
export const reportsApi = {
  // Get all reports for a project
  getByProject: async (projectId: string) => apiFetch(`/reports/project/${projectId}`),

  // Get all reports
  getAll: async () => apiFetch('/reports'),

  // Get a single report
  getById: async (id: string) => apiFetch(`/reports/${id}`),

  // Generate a new report
  generate: async (data: ReportGenerateOptions) => apiFetch('/reports/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Update a report
  update: async (id: string, data: any) => apiFetch(`/reports/${id}`, {
    method: 'PUT',
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

  // Validate report against standard
  validate: async (id: string, standard: string) => apiFetch(`/reports/${id}/validate`, {
    method: 'POST',
    body: JSON.stringify({ standard }),
  }),

  // Submit report for approval
  submit: async (id: string) => apiFetch(`/reports/${id}/submit`, {
    method: 'POST',
  }),
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
  // Get audit logs
  getAll: async (params?: { projectId?: string; userId?: string; action?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.projectId) queryParams.append('projectId', params.projectId);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return apiFetch(`/audit-logs${query}`);
  },

  // Get by project
  getByProject: async (projectId: string) => apiFetch(`/audit-logs/project/${projectId}`),
};

// Signatures API
export const signaturesApi = {
  // Sign a report
  sign: async (reportId: string, data: { type: string; notes?: string }) =>
    apiFetch(`/signatures/${reportId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Get signatures for a report
  getByReport: async (reportId: string) => apiFetch(`/signatures/report/${reportId}`),

  // Verify a signature
  verify: async (signatureId: string) => apiFetch(`/signatures/${signatureId}/verify`),
};

// Standards API
export const standardsApi = {
  // Get all supported standards
  getAll: async () => apiFetch('/standards'),

  // Get standard details
  getById: async (standardId: string) => apiFetch(`/standards/${standardId}`),

  // Validate data against a standard
  validate: async (standardId: string, projectId: string) =>
    apiFetch(`/standards/${standardId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    }),
};

// Health check
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:2047/health');
    return response.ok;
  } catch {
    return false;
  }
};

// Export all APIs
export default {
  auth: authApi,
  projects: projectsApi,
  activities: activitiesApi,
  calculations: calculationsApi,
  reports: reportsApi,
  emissionFactors: emissionFactorsApi,
  files: filesApi,
  auditLogs: auditLogsApi,
  signatures: signaturesApi,
  standards: standardsApi,
  healthCheck,
};
