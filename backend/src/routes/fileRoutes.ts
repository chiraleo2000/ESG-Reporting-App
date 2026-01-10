import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorizeProjectOwner } from '../middleware/auth';
import { config } from '../config';
import * as fileController from '../controllers/fileController';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
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

// All routes require authentication
router.use(authenticate);

// Upload file
router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(fileController.uploadFile)
);

// Get files for a project
router.get(
  '/project/:projectId',
  authorizeProjectOwner('projectId'),
  asyncHandler(fileController.getProjectFiles)
);

// Get single file info
router.get(
  '/:id',
  asyncHandler(fileController.getFile)
);

// Delete file
router.delete(
  '/:id',
  asyncHandler(fileController.deleteFile)
);

// Download file template
router.get(
  '/template/:format',
  asyncHandler(fileController.downloadTemplate)
);

// Re-parse file (if parsing failed initially)
router.post(
  '/:id/reparse',
  asyncHandler(fileController.reparseFile)
);

export default router;
