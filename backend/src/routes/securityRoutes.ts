import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import * as securityController from '../controllers/securityController';

const router = Router();

router.use(authenticate);
router.use(authorize('owner'));

router.get('/alerts', asyncHandler(securityController.listAlerts));
router.get('/summary', asyncHandler(securityController.getSummary));
router.post('/alerts/:id/resolve', asyncHandler(securityController.resolveAlert));

export default router;
