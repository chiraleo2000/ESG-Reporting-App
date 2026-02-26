/**
 * Integration Layer Registry
 * 
 * Manages external data source connectors for importing emission data
 * from REST APIs, SSH/SFTP servers, and file uploads.
 */

import { logger } from '../utils/logger';
import type { IDataConnector } from './types';

// Re-export types from central types module
export type { ConnectorType, DataSourceConfig, ConnectorResult, IDataConnector } from './types';

// Re-export connector factory and classes
export { createConnector } from './connectorFactory';
export { RestApiConnector } from './restApiConnector';
export { SshConnector } from './sshConnector';
export { FileParser } from './fileParser';
export { SyncScheduler } from './syncScheduler';

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
