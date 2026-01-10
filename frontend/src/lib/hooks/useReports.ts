import { useState, useEffect, useCallback } from 'react';
import { reportsApi } from '../api';

export interface Report {
  id: string;
  projectId: string;
  batchId: string | null;
  standard: string;
  title: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  generatedAt: string;
  generatedBy: string;
  status: 'generating' | 'completed' | 'failed' | 'signed';
  version: number;
  verificationStatus: string | null;
  signatureCount: number;
  filePath: string | null;
  fileSize: number | null;
  metadata: any;
  createdAt: string;
}

export interface ReportGenerationOptions {
  projectId: string;
  standard: string;
  title?: string;
  reportingPeriodStart?: string;
  reportingPeriodEnd?: string;
  includeBreakdown?: boolean;
  includeMethodology?: boolean;
  outputFormat?: 'json' | 'pdf' | 'html';
}

export interface UseReportsResult {
  reports: Report[];
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  fetchReports: (projectId: string) => Promise<void>;
  generateReport: (options: ReportGenerationOptions) => Promise<Report | null>;
  downloadReport: (reportId: string, format?: string) => Promise<void>;
  deleteReport: (reportId: string) => Promise<boolean>;
}

export function useReports(projectId?: string): UseReportsResult {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async (pid: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await reportsApi.getByProject(pid);
      
      if (response.success && response.data) {
        setReports(response.data as Report[]);
      } else {
        setError(response.error || 'Failed to fetch reports');
        setReports([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchReports(projectId);
    }
  }, [projectId, fetchReports]);

  const generateReport = useCallback(async (options: ReportGenerationOptions): Promise<Report | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await reportsApi.generate(options);
      
      if (response.success && response.data) {
        // Refresh reports list
        if (options.projectId) {
          await fetchReports(options.projectId);
        }
        return response.data as Report;
      } else {
        setError(response.error || 'Failed to generate report');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [fetchReports]);

  const downloadReport = useCallback(async (reportId: string, format: string = 'pdf') => {
    try {
      const response = await reportsApi.download(reportId, format);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportId}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to download report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const deleteReport = useCallback(async (reportId: string): Promise<boolean> => {
    // Note: Need to add delete endpoint to API if not exists
    // For now, return false
    setError('Delete not implemented');
    return false;
  }, []);

  return {
    reports,
    isLoading,
    isGenerating,
    error,
    fetchReports,
    generateReport,
    downloadReport,
    deleteReport,
  };
}
