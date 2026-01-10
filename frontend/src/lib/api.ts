// API Service for ESG Reporting App

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
  getByProject: async (projectId: string) => apiFetch(`/reports/project/${projectId}`),
  generate: async (data: any) => apiFetch('/reports/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  download: async (id: string, format: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/reports/${id}/download?format=${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response;
  },
};

// Emission Factors API
export const emissionFactorsApi = {
  search: async (query: string) => apiFetch(`/emission-factors/search?q=${encodeURIComponent(query)}`),
  getById: async (id: string) => apiFetch(`/emission-factors/${id}`),
  getByScope: async (scope: string) => apiFetch(`/emission-factors/scope/${scope}`),
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

export default {
  auth: authApi,
  projects: projectsApi,
  activities: activitiesApi,
  calculations: calculationsApi,
  reports: reportsApi,
  emissionFactors: emissionFactorsApi,
  healthCheck,
};
