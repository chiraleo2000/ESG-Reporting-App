/**
 * Integration Layer Registry
 * 
 * Manages external data source connectors for importing emission data
 * from REST APIs, SSH/SFTP servers, and file uploads.
 */

import { RestApiConnector } from './restApiConnector';
import { SshConnector } from './sshConnector';
import { FileParser } from './fileParser';
import { SyncScheduler } from './syncScheduler';
import { logger } from '../utils/logger';

// Connector types
export type ConnectorType = 'rest_api' | 'ssh_sftp' | 'file_upload';

// Base connector interface
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

export interface ConnectorResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  errors: Array<{ row?: number; field?: string; message: string }>;
  data?: any[];
}

export interface IDataConnector {
  connect(config: Record<string, any>): Promise<boolean>;
  fetchData(config: Record<string, any>): Promise<any[]>;
  parseData(rawData: any[], mapping?: Record<string, string>): Promise<any[]>;
  validate(data: any[]): Promise<{ valid: any[]; errors: any[] }>;
  disconnect(): Promise<void>;
}

// Connector factory
export function createConnector(type: ConnectorType): IDataConnector {
  switch (type) {
    case 'rest_api':
      return new RestApiConnector();
    case 'ssh_sftp':
      return new SshConnector();
    case 'file_upload':
      return new FileParser();
    default:
      throw new Error(`Unknown connector type: ${type}`);
  }
}

// Registry of active connectors
const activeConnectors = new Map<string, IDataConnector>();

export function registerConnector(id: string, connector: IDataConnector): void {
  activeConnectors.set(id, connector);
  logger.info(`Registered data connector: ${id}`);
}

export function getConnector(id: string): IDataConnector | undefined {
  return activeConnectors.get(id);
}

export function removeConnector(id: string): void {
  const connector = activeConnectors.get(id);
  if (connector) {
    connector.disconnect().catch((err) => {
      logger.error(`Error disconnecting connector ${id}:`, err);
    });
    activeConnectors.delete(id);
    logger.info(`Removed data connector: ${id}`);
  }
}

export function listConnectors(): string[] {
  return Array.from(activeConnectors.keys());
}

export {
  RestApiConnector,
  SshConnector,
  FileParser,
  SyncScheduler,
};
