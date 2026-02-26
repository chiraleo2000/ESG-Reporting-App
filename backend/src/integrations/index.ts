/**
 * Integration Layer Registry
 * 
 * Manages external data source connectors for importing emission data
 * from REST APIs, SSH/SFTP servers, and file uploads.
 */

// Import classes needed locally for createConnector factory
import { RestApiConnector } from './restApiConnector';
import { SshConnector } from './sshConnector';
import { FileParser } from './fileParser';
import { logger } from '../utils/logger';

// Import types needed locally for function signatures
import type { ConnectorType, IDataConnector } from './types';

// Re-export types from central types module
export type { ConnectorType, DataSourceConfig, ConnectorResult, IDataConnector } from './types';

// Re-export connector classes
export { RestApiConnector } from './restApiConnector';
export { SshConnector } from './sshConnector';
export { FileParser } from './fileParser';
export { SyncScheduler } from './syncScheduler';

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
