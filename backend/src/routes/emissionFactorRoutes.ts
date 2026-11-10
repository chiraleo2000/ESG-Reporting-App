import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorizeProjectMember } from '../middleware/auth';
import {
  validate,
  serpAPILookupSchema,
  gridEFOverrideSchema,
  precursorFactorOverrideSchema,
} from '../middleware/validation';
import * as emissionFactorController from '../controllers/emissionFactorController';

const router = Router();

router.use(authenticate);

router.post(
  '/serpapi/lookup',
  validate(serpAPILookupSchema),
  asyncHandler(emissionFactorController.serpAPILookup)
);

router.get(
  '/grid/:country/:year',
  asyncHandler(emissionFactorController.getGridEF)
);

router.get(
  '/grid/history/:country',
  asyncHandler(emissionFactorController.getGridEFHistory)
);

router.put(
  '/grid/override',
  validate(gridEFOverrideSchema),
  asyncHandler(emissionFactorController.overrideGridEF)
);

router.delete(
  '/grid/override/:projectId/:country',
  authorizeProjectMember('editor', 'projectId'),
  asyncHandler(emissionFactorController.deleteGridEFOverride)
);

router.get(
  '/precursor/defaults',
  asyncHandler(emissionFactorController.getPrecursorDefaults)
);

router.get(
  '/precursor/:projectId',
  authorizeProjectMember('viewer', 'projectId'),
  asyncHandler(emissionFactorController.getProjectPrecursorFactors)
);

router.put(
  '/precursor/override',
  validate(precursorFactorOverrideSchema),
  asyncHandler(emissionFactorController.overridePrecursorFactor)
);

router.delete(
  '/precursor/override/:projectId/:materialType/:productionRoute',
  authorizeProjectMember('editor', 'projectId'),
  asyncHandler(emissionFactorController.deletePrecursorOverride)
);

router.get(
  '/standard/:standard',
  asyncHandler(emissionFactorController.getStandardEFs)
);

router.get(
  '/search',
  asyncHandler(emissionFactorController.searchEmissionFactors)
);

export default router;
