import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorizeProjectOwner } from '../middleware/auth';
import { 
  validate, 
  createProjectSchema, 
  updateProjectSchema, 
  paginationSchema,
  uuidSchema 
} from '../middleware/validation';
import * as projectController from '../controllers/projectController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create new project
router.post(
  '/',
  validate(createProjectSchema),
  asyncHandler(projectController.createProject)
);

// Get all projects for current user
router.get(
  '/',
  validate(paginationSchema, 'query'),
  asyncHandler(projectController.getProjects)
);

// Get single project
router.get(
  '/:id',
  authorizeProjectOwner('id'),
  asyncHandler(projectController.getProject)
);

// Update project
router.put(
  '/:id',
  authorizeProjectOwner('id'),
  validate(updateProjectSchema),
  asyncHandler(projectController.updateProject)
);

// Delete project (soft delete)
router.delete(
  '/:id',
  authorizeProjectOwner('id'),
  asyncHandler(projectController.deleteProject)
);

// Get project comparison (baseline vs reporting year)
router.get(
  '/:id/comparison',
  authorizeProjectOwner('id'),
  asyncHandler(projectController.getProjectComparison)
);

// Get project calculation history
router.get(
  '/:id/calculations',
  authorizeProjectOwner('id'),
  validate(paginationSchema, 'query'),
  asyncHandler(projectController.getCalculationHistory)
);

// Get project reports
router.get(
  '/:id/reports',
  authorizeProjectOwner('id'),
  validate(paginationSchema, 'query'),
  asyncHandler(projectController.getProjectReports)
);

export default router;
