import { Request, Response } from 'express';
import { NotFoundError } from '../middleware/errorHandler';
import * as securityAlertService from '../services/securityAlertService';

export async function listAlerts(req: Request, res: Response): Promise<void> {
  const { page = 1, limit = 50, resolved, severity } = req.query;
  const result = await securityAlertService.listAlerts({
    page: Number(page),
    limit: Number(limit),
    resolved: resolved === undefined ? undefined : resolved === 'true',
    severity: severity as string | undefined,
  });

  res.json({
    success: true,
    data: result.alerts,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: result.total,
      totalPages: Math.ceil(result.total / Number(limit)),
    },
  });
}

export async function getSummary(req: Request, res: Response): Promise<void> {
  const summary = await securityAlertService.getSecuritySummary();
  res.json({ success: true, data: summary });
}

export async function resolveAlert(req: Request, res: Response): Promise<void> {
  const { id } = req.params as Record<string, string>;
  const ok = await securityAlertService.resolveAlert(id, req.user!.id);
  if (!ok) throw new NotFoundError('Alert not found or already resolved');
  res.json({ success: true, message: 'Alert resolved' });
}
