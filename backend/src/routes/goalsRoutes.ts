import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorizeProjectOwner } from '../middleware/auth';
import * as goalsController from '../controllers/goalsController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get ESG goals for a project
router.get(
  '/project/:projectId',
  authorizeProjectOwner('projectId'),
  asyncHandler(goalsController.getGoals)
);

// Get ESG goals summary for a project
router.get(
  '/project/:projectId/summary',
  authorizeProjectOwner('projectId'),
  asyncHandler(goalsController.getGoalsSummary)
);

// Create a new ESG goal
router.post(
  '/project/:projectId',
  authorizeProjectOwner('projectId'),
  asyncHandler(goalsController.createGoal)
);

// Bulk update progress for all goals in a project
router.post(
  '/project/:projectId/bulk-progress',
  authorizeProjectOwner('projectId'),
  asyncHandler(goalsController.bulkUpdateProgress)
);

// Get a single goal
router.get(
  '/project/:projectId/:goalId',
  authorizeProjectOwner('projectId'),
  asyncHandler(goalsController.getGoal)
);

// Update a goal
router.put(
  '/project/:projectId/:goalId',
  authorizeProjectOwner('projectId'),
  asyncHandler(goalsController.updateGoal)
);

// Update goal progress from emissions data
router.post(
  '/project/:projectId/:goalId/progress',
  authorizeProjectOwner('projectId'),
  asyncHandler(goalsController.updateGoalProgress)
);

// Delete a goal
router.delete(
  '/project/:projectId/:goalId',
  authorizeProjectOwner('projectId'),
  asyncHandler(goalsController.deleteGoal)
);

export default router;
