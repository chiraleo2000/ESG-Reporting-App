import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorizeProjectMember } from '../middleware/auth';
import * as goalsController from '../controllers/goalsController';

const router = Router();

router.use(authenticate);

router.get(
  '/project/:projectId',
  authorizeProjectMember('viewer', 'projectId'),
  asyncHandler(goalsController.getGoals)
);

router.get(
  '/project/:projectId/summary',
  authorizeProjectMember('viewer', 'projectId'),
  asyncHandler(goalsController.getGoalsSummary)
);

router.post(
  '/project/:projectId',
  authorizeProjectMember('editor', 'projectId'),
  asyncHandler(goalsController.createGoal)
);

router.post(
  '/project/:projectId/bulk-progress',
  authorizeProjectMember('editor', 'projectId'),
  asyncHandler(goalsController.bulkUpdateProgress)
);

router.get(
  '/project/:projectId/:goalId',
  authorizeProjectMember('viewer', 'projectId'),
  asyncHandler(goalsController.getGoal)
);

router.put(
  '/project/:projectId/:goalId',
  authorizeProjectMember('editor', 'projectId'),
  asyncHandler(goalsController.updateGoal)
);

router.post(
  '/project/:projectId/:goalId/progress',
  authorizeProjectMember('editor', 'projectId'),
  asyncHandler(goalsController.updateGoalProgress)
);

router.delete(
  '/project/:projectId/:goalId',
  authorizeProjectMember('editor', 'projectId'),
  asyncHandler(goalsController.deleteGoal)
);

export default router;
