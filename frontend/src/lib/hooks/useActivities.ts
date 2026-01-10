import { useState, useEffect, useCallback } from 'react';
import { activitiesApi } from '../api';

export interface Activity {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  scope: 'scope1' | 'scope2' | 'scope3';
  scope3Category: string | null;
  activityType: string;
  quantity: number;
  unit: string;
  source: string | null;
  tierLevel: string;
  tierDirection: string;
  dataSource: string | null;
  dataQualityScore: number | null;
  calculationStatus: 'pending' | 'calculated' | 'error';
  totalEmissionsKgCo2e: number | null;
  emissionFactorUsed: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityFilters {
  scope?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UseActivitiesResult {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  refetch: () => Promise<void>;
  createActivity: (data: Partial<Activity>) => Promise<boolean>;
  updateActivity: (id: string, data: Partial<Activity>) => Promise<boolean>;
  deleteActivity: (id: string) => Promise<boolean>;
}

export function useActivities(projectId: string | null, filters: ActivityFilters = {}): UseActivitiesResult {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const fetchActivities = useCallback(async () => {
    if (!projectId) {
      setActivities([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await activitiesApi.getByProject(projectId);
      
      if (response.success && response.data) {
        setActivities(response.data as Activity[]);
        if ((response as any).pagination) {
          setPagination((response as any).pagination);
        }
      } else {
        setError(response.error || 'Failed to fetch activities');
        setActivities([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, filters.scope, filters.status, filters.search, filters.page, filters.limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const createActivity = useCallback(async (data: Partial<Activity>): Promise<boolean> => {
    if (!projectId) return false;

    try {
      const response = await activitiesApi.createForProject(projectId, data);
      if (response.success) {
        await fetchActivities();
        return true;
      }
      setError(response.error || 'Failed to create activity');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [projectId, fetchActivities]);

  const updateActivity = useCallback(async (id: string, data: Partial<Activity>): Promise<boolean> => {
    try {
      const response = await activitiesApi.update(id, data);
      if (response.success) {
        await fetchActivities();
        return true;
      }
      setError(response.error || 'Failed to update activity');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [fetchActivities]);

  const deleteActivity = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await activitiesApi.delete(id);
      if (response.success) {
        await fetchActivities();
        return true;
      }
      setError(response.error || 'Failed to delete activity');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [fetchActivities]);

  return {
    activities,
    isLoading,
    error,
    pagination,
    refetch: fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
  };
}
