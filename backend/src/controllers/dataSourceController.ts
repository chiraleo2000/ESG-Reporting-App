/**
 * Data Source Controller
 * 
 * Handles HTTP requests for managing external data sources
 * (REST API, SSH/SFTP, file upload connections).
 */

import { Request, Response } from 'express';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import * as dataSourceService from '../services/dataSourceService';
import type { ConnectorType } from '../integrations';

/**
 * Create a new data source
 * POST /api/v1/data-sources/:projectId
 */
export async function createDataSource(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const userId = (req as any).user?.id;
  const { name, type, config, schedule, mapping } = req.body;

  if (!name || !type || !config) {
    throw new BadRequestError('Name, type, and config are required');
  }

  const validTypes: ConnectorType[] = ['rest_api', 'ssh_sftp', 'file_upload'];
  if (!validTypes.includes(type)) {
    throw new BadRequestError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
  }

  const dataSource = await dataSourceService.createDataSource(projectId, userId, {
    name,
    type,
    config,
    schedule,
    mapping,
  });

  res.status(201).json({
    success: true,
    data: dataSource,
    message: 'Data source created successfully',
  });
}

/**
 * Get all data sources for a project
 * GET /api/v1/data-sources/:projectId
 */
export async function getDataSources(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  const dataSources = await dataSourceService.getDataSources(projectId);

  res.json({
    success: true,
    data: dataSources,
    count: dataSources.length,
  });
}

/**
 * Get a single data source
 * GET /api/v1/data-sources/:projectId/:id
 */
export async function getDataSource(req: Request, res: Response): Promise<void> {
  const { projectId, id } = req.params;

  const dataSource = await dataSourceService.getDataSource(id, projectId);
  if (!dataSource) {
    throw new NotFoundError('Data source not found');
  }

  res.json({
    success: true,
    data: dataSource,
  });
}

/**
 * Update a data source
 * PUT /api/v1/data-sources/:projectId/:id
 */
export async function updateDataSource(req: Request, res: Response): Promise<void> {
  const { projectId, id } = req.params;
  const userId = (req as any).user?.id;
  const { name, config, schedule, mapping, enabled } = req.body;

  const updated = await dataSourceService.updateDataSource(id, projectId, userId, {
    name, config, schedule, mapping, enabled,
  });

  if (!updated) {
    throw new NotFoundError('Data source not found');
  }

  res.json({
    success: true,
    data: updated,
    message: 'Data source updated successfully',
  });
}

/**
 * Delete a data source
 * DELETE /api/v1/data-sources/:projectId/:id
 */
export async function deleteDataSource(req: Request, res: Response): Promise<void> {
  const { projectId, id } = req.params;
  const userId = (req as any).user?.id;

  const deleted = await dataSourceService.deleteDataSource(id, projectId, userId);
  if (!deleted) {
    throw new NotFoundError('Data source not found');
  }

  res.json({
    success: true,
    message: 'Data source deleted successfully',
  });
}

/**
 * Trigger an immediate sync
 * POST /api/v1/data-sources/:projectId/:id/sync
 */
export async function triggerSync(req: Request, res: Response): Promise<void> {
  const { projectId, id } = req.params;
  const userId = (req as any).user?.id;

  const result = await dataSourceService.triggerSync(id, projectId, userId);

  res.json({
    success: result.success,
    data: {
      recordsProcessed: result.recordsProcessed,
      recordsFailed: result.recordsFailed,
      errors: result.errors,
    },
    message: result.success
      ? `Sync completed: ${result.recordsProcessed} records processed`
      : 'Sync failed',
  });
}

/**
 * Test a data source connection
 * POST /api/v1/data-sources/test-connection
 */
export async function testConnection(req: Request, res: Response): Promise<void> {
  const { type, config } = req.body;

  if (!type || !config) {
    throw new BadRequestError('Type and config are required');
  }

  const result = await dataSourceService.testConnection(type, config);

  res.json({
    success: result.success,
    message: result.message,
  });
}
