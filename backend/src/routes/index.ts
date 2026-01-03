import { Router } from 'express';
import authRoutes from './authRoutes';
import projectRoutes from './projectRoutes';
import activityRoutes from './activityRoutes';
import fileRoutes from './fileRoutes';
import calculationRoutes from './calculationRoutes';
import reportRoutes from './reportRoutes';
import emissionFactorRoutes from './emissionFactorRoutes';
import auditRoutes from './auditRoutes';
import signatureRoutes from './signatureRoutes';
import standardRoutes from './standardRoutes';
import embeddingRoutes from './embeddingRoutes';
import helpRoutes from './helpRoutes';

const router = Router();
const API_VERSION = '/v1';

// Help & Documentation Routes (no auth required)
router.use('/', helpRoutes);

// API Routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/projects`, projectRoutes);
router.use(`${API_VERSION}/activities`, activityRoutes);
router.use(`${API_VERSION}/files`, fileRoutes);
router.use(`${API_VERSION}/calculate`, calculationRoutes);
router.use(`${API_VERSION}/reports`, reportRoutes);
router.use(`${API_VERSION}/emission-factors`, emissionFactorRoutes);
router.use(`${API_VERSION}/audit-logs`, auditRoutes);
router.use(`${API_VERSION}/signatures`, signatureRoutes);
router.use(`${API_VERSION}/standards`, standardRoutes);
router.use(`${API_VERSION}/embeddings`, embeddingRoutes);

// API Info (versioned)
router.get(`${API_VERSION}`, (req, res) => {
  res.json({
    name: 'ESG Reporting API',
    version: '1.0.0',
    documentation: '/api/help',
    demoGuide: '/api/help/demo',
    endpoints: {
      auth: `${API_VERSION}/auth`,
      projects: `${API_VERSION}/projects`,
      activities: `${API_VERSION}/activities`,
      files: `${API_VERSION}/files`,
      calculations: `${API_VERSION}/calculate`,
      reports: `${API_VERSION}/reports`,
      emissionFactors: `${API_VERSION}/emission-factors`,
      auditLogs: `${API_VERSION}/audit-logs`,
      signatures: `${API_VERSION}/signatures`,
      standards: `${API_VERSION}/standards`,
      embeddings: `${API_VERSION}/embeddings`,
    },
    standards: ['EU CBAM', 'UK CBAM', 'China Carbon Market', 'Japan MAFF ESG', 'Korea K-ESG', 'Thailand Thai-ESG'],
  });
});

export default router;
