/**
 * Connector Factory
 *
 * Creates data source connector instances by type.
 * Separated from index.ts to break the circular dependency
 * with syncScheduler.ts.
 */

import { RestApiConnector } from './restApiConnector';
import { SshConnector } from './sshConnector';
import { FileParser } from './fileParser';
import type { ConnectorType, IDataConnector } from './types';

/**
 * Factory function to create a new connector instance by type.
 */
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
