import { useState, useCallback } from 'react';
import { calculationsApi } from '../api';

export interface CalculationTotals {
  scope1: number;
  scope2: number;
  scope3: number;
  scope3Categories: Record<string, number>;
  total: number;
  totalTonnesCO2e: number;
  activityCount: number;
  pendingActivities: number;
}

export interface UseCalculationsResult {
  totals: CalculationTotals | null;
  isLoading: boolean;
  isCalculating: boolean;
  error: string | null;
  fetchTotals: (projectId: string) => Promise<void>;
  calculateAll: (projectId: string) => Promise<boolean>;
  calculateActivity: (projectId: string, activityId: string) => Promise<boolean>;
  calculateCFP: (projectId: string, options?: any) => Promise<any>;
  calculateCFO: (projectId: string, options?: any) => Promise<any>;
}

export function useCalculations(): UseCalculationsResult {
  const [totals, setTotals] = useState<CalculationTotals | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTotals = useCallback(async (projectId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await calculationsApi.getTotals(projectId);
      
      if (response.success && response.data) {
        setTotals(response.data as CalculationTotals);
      } else {
        setError(response.error || 'Failed to fetch calculation totals');
        setTotals(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setTotals(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const calculateAll = useCallback(async (projectId: string): Promise<boolean> => {
    setIsCalculating(true);
    setError(null);

    try {
      const response = await calculationsApi.calculateAll(projectId);
      
      if (response.success) {
        // Refresh totals after calculation
        await fetchTotals(projectId);
        return true;
      } else {
        setError(response.error || 'Failed to run calculations');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsCalculating(false);
    }
  }, [fetchTotals]);

  const calculateActivity = useCallback(async (projectId: string, activityId: string): Promise<boolean> => {
    setIsCalculating(true);
    setError(null);

    try {
      const response = await calculationsApi.calculateActivity(projectId, activityId);
      
      if (response.success) {
        await fetchTotals(projectId);
        return true;
      } else {
        setError(response.error || 'Failed to calculate activity');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsCalculating(false);
    }
  }, [fetchTotals]);

  const calculateCFP = useCallback(async (projectId: string, options?: any): Promise<any> => {
    setIsCalculating(true);
    setError(null);

    try {
      const response = await calculationsApi.calculateCFP(projectId, options);
      
      if (response.success) {
        return response.data;
      } else {
        setError(response.error || 'Failed to calculate CFP');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const calculateCFO = useCallback(async (projectId: string, options?: any): Promise<any> => {
    setIsCalculating(true);
    setError(null);

    try {
      const response = await calculationsApi.calculateCFO(projectId, options);
      
      if (response.success) {
        return response.data;
      } else {
        setError(response.error || 'Failed to calculate CFO');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, []);

  return {
    totals,
    isLoading,
    isCalculating,
    error,
    fetchTotals,
    calculateAll,
    calculateActivity,
    calculateCFP,
    calculateCFO,
  };
}
