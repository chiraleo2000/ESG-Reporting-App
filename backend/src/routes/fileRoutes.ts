import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { asyncHandler } from '../middleware/errorHandler';
import {
  authenticate,
  authorizeProjectMember,
  authorizeEntityProjectMember,
} from '../middleware/auth';
import { config } from '../config';
import * as fileController from '../controllers/fileController';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${randomBytes(8).toString('hex')}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if ((config.upload.allowedTypes as readonly string[]).includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${config.upload.allowedTypes.join(', ')}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSizeBytes,
  },
});

router.use(authenticate);

router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(fileController.uploadFile)
);

router.get(
  '/project/:projectId',
  authorizeProjectMember('viewer', 'projectId'),
  asyncHandler(fileController.getProjectFiles)
);

router.get(
  '/template/:format',
  asyncHandler(fileController.downloadTemplate)
);

router.get(
  '/:id',
  authorizeEntityProjectMember('files', 'id', 'viewer'),
  asyncHandler(fileController.getFile)
);

router.delete(
  '/:id',
  authorizeEntityProjectMember('files', 'id', 'editor'),
  asyncHandler(fileController.deleteFile)
);

router.post(
  '/:id/reparse',
  authorizeEntityProjectMember('files', 'id', 'editor'),
  asyncHandler(fileController.reparseFile)
);

router.post(
  '/:id/parse',
  authorizeEntityProjectMember('files', 'id', 'editor'),
  asyncHandler(fileController.parseExcelActivities)
);

router.post(
  '/:id/import',
  authorizeEntityProjectMember('files', 'id', 'editor'),
  asyncHandler(fileController.importExcelActivities)
);

export default router;
