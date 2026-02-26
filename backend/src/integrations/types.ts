/**
 * Integration Layer Types
 *
 * Shared type definitions for all data source connectors.
 * Extracted to break circular dependency between index.ts and connector modules.
 */

// Connector types
export type ConnectorType = 'rest_api' | 'ssh_sftp' | 'file_upload';

// Data source configuration
export interface DataSourceConfig {
  id: string;
  name: string;
  type: ConnectorType;
  projectId: string;
  config: Record<string, any>;
  schedule?: string; // cron expression
  mapping?: Record<string, string>; // field mapping rules
  enabled: boolean;
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'error' | 'pending';
  lastSyncError?: string;
}

// Connector result envelope
export interface ConnectorResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  errors: Array<{ row?: number; field?: string; message: string }>;
  data?: any[];
}

// Base connector interface (all connectors must implement)
export interface IDataConnector {
  connect(config: Record<string, any>): Promise<boolean>;
  fetchData(config: Record<string, any>): Promise<any[]>;
  parseData(rawData: any[], mapping?: Record<string, string>): Promise<any[]>;
  validate(data: any[]): Promise<{ valid: any[]; errors: any[] }>;
  disconnect(): Promise<void>;
}
