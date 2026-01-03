import { Router } from 'express';
import {
  searchDocuments,
  storeDocument,
  findSimilarActivities,
  suggestEmissionFactors,
  embedActivity,
  embedEmissionFactor,
  storeConversation,
  getConversationHistory,
  getEmbeddingStats,
  cleanupCache,
} from '../controllers/embeddingController';
import { authenticate as authMiddleware } from '../middleware/auth';
import { validate as validateRequest } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/v1/embeddings/search
 * @desc    Semantic search across documents
 * @access  Private
 */
router.post('/search', searchDocuments);

/**
 * @route   POST /api/v1/embeddings/documents
 * @desc    Store a document with embedding
 * @access  Private
 */
router.post('/documents', storeDocument);

/**
 * @route   POST /api/v1/embeddings/activities/similar
 * @desc    Find similar activities using semantic search
 * @access  Private
 */
router.post('/activities/similar', findSimilarActivities);

/**
 * @route   POST /api/v1/embeddings/emission-factors/suggest
 * @desc    Suggest emission factors based on activity description
 * @access  Private
 */
router.post('/emission-factors/suggest', suggestEmissionFactors);

/**
 * @route   POST /api/v1/embeddings/activities
 * @desc    Create/update activity embedding
 * @access  Private
 */
router.post('/activities', embedActivity);

/**
 * @route   POST /api/v1/embeddings/emission-factors
 * @desc    Create/update emission factor embedding
 * @access  Private
 */
router.post('/emission-factors', embedEmissionFactor);

/**
 * @route   POST /api/v1/embeddings/conversations
 * @desc    Store conversation message
 * @access  Private
 */
router.post('/conversations', storeConversation);

/**
 * @route   GET /api/v1/embeddings/conversations/:sessionId
 * @desc    Get conversation history for a session
 * @access  Private
 */
router.get('/conversations/:sessionId', getConversationHistory);

/**
 * @route   GET /api/v1/embeddings/stats
 * @desc    Get embedding statistics
 * @access  Private
 */
router.get('/stats', getEmbeddingStats);

/**
 * @route   POST /api/v1/embeddings/cache/cleanup
 * @desc    Cleanup expired cache entries
 * @access  Private (Admin)
 */
router.post('/cache/cleanup', cleanupCache);

export default router;
