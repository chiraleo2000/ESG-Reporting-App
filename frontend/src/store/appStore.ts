import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  organization?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  organization?: string;
  industry?: string;
  country?: string;
  baselineYear: number;
  reportingYear: number;
  status: 'active' | 'archived' | 'draft';
  standards: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  projectId: string;
  name: string;
  scope: 'scope1' | 'scope2' | 'scope3';
  scope3Category?: string;
  activityType: string;
  activityData: number;
  activityUnit: string;
  emissionFactor?: number;
  emissionFactorUnit?: string;
  calculationTier: 'tier1' | 'tier2' | 'tier3';
  year: number;
  facility?: string;
  dataQualityScore?: number;
}

export interface CalculationResult {
  projectId: string;
  totalEmissions: number;
  scope1Total: number;
  scope2Total: number;
  scope3Total: number;
  scope3ByCategory: Record<string, number>;
  emissionsByYear: Record<number, number>;
  hotSpots: Array<{ name: string; emissions: number; percentage: number }>;
  dataQualityScore: number;
  calculatedAt: string;
}

export interface Report {
  id: string;
  projectId: string;
  name: string;
  standard: string;
  status: 'draft' | 'pending_review' | 'approved' | 'submitted';
  reportingYear: number;
  generatedAt: string;
}

// App State Interface
interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  
  // Projects
  projects: Project[];
  currentProject: Project | null;
  
  // Activities
  activities: Activity[];
  
  // Calculations
  calculationResult: CalculationResult | null;
  
  // Reports
  reports: Report[];
  
  // UI State
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  
  // Actions - Auth
  setUser: (user: User | null) => void;
  logout: () => void;
  
  // Actions - Projects
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  // Actions - Activities
  setActivities: (activities: Activity[]) => void;
  addActivity: (activity: Activity) => void;
  updateActivity: (id: string, updates: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  
  // Actions - Calculations
  setCalculationResult: (result: CalculationResult | null) => void;
  
  // Actions - Reports
  setReports: (reports: Report[]) => void;
  addReport: (report: Report) => void;
  
  // Actions - UI
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccessMessage: (message: string | null) => void;
  clearMessages: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      isAuthenticated: false,
      projects: [],
      currentProject: null,
      activities: [],
      calculationResult: null,
      reports: [],
      isLoading: false,
      error: null,
      successMessage: null,

      // Auth Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      logout: () => set({ 
        user: null, 
        isAuthenticated: false,
        currentProject: null,
        activities: [],
        calculationResult: null,
      }),

      // Project Actions
      setProjects: (projects) => set({ projects }),
      
      setCurrentProject: (project) => set({ currentProject: project }),
      
      addProject: (project) => set((state) => ({
        projects: [...state.projects, project],
      })),
      
      updateProject: (id, updates) => set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
        currentProject: state.currentProject?.id === id
          ? { ...state.currentProject, ...updates, updatedAt: new Date().toISOString() }
          : state.currentProject,
      })),
      
      deleteProject: (id) => set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
      })),

      // Activity Actions
      setActivities: (activities) => set({ activities }),
      
      addActivity: (activity) => set((state) => ({
        activities: [...state.activities, activity],
      })),
      
      updateActivity: (id, updates) => set((state) => ({
        activities: state.activities.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
      })),
      
      deleteActivity: (id) => set((state) => ({
        activities: state.activities.filter((a) => a.id !== id),
      })),

      // Calculation Actions
      setCalculationResult: (calculationResult) => set({ calculationResult }),

      // Report Actions
      setReports: (reports) => set({ reports }),
      
      addReport: (report) => set((state) => ({
        reports: [...state.reports, report],
      })),

      // UI Actions
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      setSuccessMessage: (successMessage) => set({ successMessage }),
      
      clearMessages: () => set({ error: null, successMessage: null }),
    }),
    {
      name: 'esg-app-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentProject: state.currentProject,
      }),
    }
  )
);

// Selector hooks for better performance
export const useUser = () => useAppStore((state) => state.user);
export const useProjects = () => useAppStore((state) => state.projects);
export const useCurrentProject = () => useAppStore((state) => state.currentProject);
export const useActivities = () => useAppStore((state) => state.activities);
export const useCalculationResult = () => useAppStore((state) => state.calculationResult);
export const useReports = () => useAppStore((state) => state.reports);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
