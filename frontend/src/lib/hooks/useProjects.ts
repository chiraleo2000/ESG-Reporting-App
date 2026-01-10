import { useState, useEffect, useCallback } from 'react';
import { projectsApi } from '../api';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  complianceFrameworks: string[];
  reportingPeriodStart: string | null;
  reportingPeriodEnd: string | null;
  settings: any;
  status: string;
  createdAt: string;
  updatedAt: string;
  ownerEmail?: string;
  ownerName?: string;
}

export interface UseProjectsResult {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<string | null>;
  updateProject: (id: string, data: Partial<Project>) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  getProject: (id: string) => Promise<Project | null>;
}

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await projectsApi.getAll();
      
      if (response.success && response.data) {
        setProjects(response.data as Project[]);
      } else {
        setError(response.error || 'Failed to fetch projects');
        setProjects([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(async (data: Partial<Project>): Promise<string | null> => {
    try {
      const response = await projectsApi.create(data);
      if (response.success && response.data) {
        await fetchProjects();
        return (response.data as Project).id;
      }
      setError(response.error || 'Failed to create project');
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [fetchProjects]);

  const updateProject = useCallback(async (id: string, data: Partial<Project>): Promise<boolean> => {
    try {
      const response = await projectsApi.update(id, data);
      if (response.success) {
        await fetchProjects();
        return true;
      }
      setError(response.error || 'Failed to update project');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [fetchProjects]);

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await projectsApi.delete(id);
      if (response.success) {
        await fetchProjects();
        return true;
      }
      setError(response.error || 'Failed to delete project');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [fetchProjects]);

  const getProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      const response = await projectsApi.getById(id);
      if (response.success && response.data) {
        return response.data as Project;
      }
      return null;
    } catch (err) {
      return null;
    }
  }, []);

  return {
    projects,
    isLoading,
    error,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    getProject,
  };
}
