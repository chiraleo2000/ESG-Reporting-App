import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import {
  authenticate,
  authorizeProjectMember,
  requireMfaCompleted,
} from '../middleware/auth';
import {
  validate,
  createProjectSchema,
  updateProjectSchema,
  paginationSchema,
  projectMemberSchema,
  updateProjectMemberSchema,
} from '../middleware/validation';
import * as projectController from '../controllers/projectController';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate(createProjectSchema),
  asyncHandler(projectController.createProject)
);

router.get(
  '/',
  validate(paginationSchema, 'query'),
  asyncHandler(projectController.getProjects)
);

router.get(
  '/:id',
  authorizeProjectMember('viewer', 'id'),
  asyncHandler(projectController.getProject)
);

router.put(
  '/:id',
  authorizeProjectMember('editor', 'id'),
  validate(updateProjectSchema),
  asyncHandler(projectController.updateProject)
);

router.delete(
  '/:id',
  authorizeProjectMember('owner', 'id'),
  requireMfaCompleted,
  asyncHandler(projectController.deleteProject)
);

router.get(
  '/:id/comparison',
  authorizeProjectMember('viewer', 'id'),
  asyncHandler(projectController.getProjectComparison)
);

router.get(
  '/:id/calculations',
  authorizeProjectMember('viewer', 'id'),
  validate(paginationSchema, 'query'),
  asyncHandler(projectController.getCalculationHistory)
);

router.get(
  '/:id/reports',
  authorizeProjectMember('viewer', 'id'),
  validate(paginationSchema, 'query'),
  asyncHandler(projectController.getProjectReports)
);

// Team / members
router.get(
  '/:id/members',
  authorizeProjectMember('viewer', 'id'),
  asyncHandler(projectController.getProjectMembers)
);

router.post(
  '/:id/members',
  authorizeProjectMember('director', 'id'),
  requireMfaCompleted,
  validate(projectMemberSchema),
  asyncHandler(projectController.addProjectMember)
);

router.patch(
  '/:id/members/:memberId',
  authorizeProjectMember('director', 'id'),
  requireMfaCompleted,
  validate(updateProjectMemberSchema),
  asyncHandler(projectController.updateProjectMember)
);

router.delete(
  '/:id/members/:memberId',
  authorizeProjectMember('director', 'id'),
  requireMfaCompleted,
  asyncHandler(projectController.removeProjectMember)
);

export default router;
