import { Request, Response, NextFunction } from 'express';
import { EmbeddingService } from '../services/embeddingService';
import { pool } from '../config/database';

// Initialize embedding service
const embeddingService = new EmbeddingService(pool, {
  openaiApiKey: process.env.OPENAI_API_KEY,
  azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureApiKey: process.env.AZURE_OPENAI_API_KEY,
  defaultModel: process.env.EMBEDDING_MODEL || 'openai-ada-002',
});

// Initialize on first request
let initialized = false;

const ensureInitialized = async () => {
  if (!initialized) {
    await embeddingService.initialize();
    initialized = true;
  }
};

/**
 * Search documents using semantic similarity
 */
export const searchDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureInitialized();

    const { query, threshold, limit, projectId, sourceType } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query string is required',
      });
    }

    const results = await embeddingService.searchDocuments(query, {
      threshold: threshold || 0.7,
      limit: limit || 10,
      projectId,
      sourceType,
    });

    res.json({
      success: true,
      data: {
        query,
        results,
        count: results.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Store a document with embedding
 */
export const storeDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureInitialized();

    const { projectId, sourceType, sourceId, sourceUrl, title, content, metadata, tags, language } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
      });
    }

    if (!sourceType) {
      return res.status(400).json({
        success: false,
        error: 'Source type is required',
      });
    }

    const documentId = await embeddingService.storeDocument({
      projectId,
      sourceType,
      sourceId,
      sourceUrl,
      title,
      content,
      metadata,
      tags,
      language,
    });

    res.status(201).json({
      success: true,
      data: {
        id: documentId,
        message: 'Document stored and embedded successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Find similar activities
 */
export const findSimilarActivities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureInitialized();

    const { query, limit } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query string is required',
      });
    }

    const results = await embeddingService.findSimilarActivities(query, limit || 5);

    res.json({
      success: true,
      data: {
        query,
        results,
        count: results.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suggest emission factors based on description
 */
export const suggestEmissionFactors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureInitialized();

    const { description, limit } = req.body;

    if (!description || typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Description is required',
      });
    }

    const suggestions = await embeddingService.suggestEmissionFactors(description, limit || 5);

    res.json({
      success: true,
      data: {
        description,
        suggestions,
        count: suggestions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Store activity embedding
 */
export const embedActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureInitialized();

    const { activityId, searchableContent } = req.body;

    if (!activityId || !searchableContent) {
      return res.status(400).json({
        success: false,
        error: 'Activity ID and searchable content are required',
      });
    }

    await embeddingService.storeActivityEmbedding(activityId, searchableContent);

    res.json({
      success: true,
      message: 'Activity embedded successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Store emission factor embedding
 */
export const embedEmissionFactor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureInitialized();

    const { emissionFactorId, searchableContent } = req.body;

    if (!emissionFactorId || !searchableContent) {
      return res.status(400).json({
        success: false,
        error: 'Emission factor ID and searchable content are required',
      });
    }

    await embeddingService.storeEmissionFactorEmbedding(emissionFactorId, searchableContent);

    res.json({
      success: true,
      message: 'Emission factor embedded successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Store conversation message
 */
export const storeConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureInitialized();

    const { sessionId, role, content, projectId, modelName, modelProvider, promptTokens, completionTokens, responseTimeMs } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    if (!sessionId || !role || !content) {
      return res.status(400).json({
        success: false,
        error: 'Session ID, role, and content are required',
      });
    }

    const conversationId = await embeddingService.storeConversation(
      userId,
      sessionId,
      role,
      content,
      { projectId, modelName, modelProvider, promptTokens, completionTokens, responseTimeMs }
    );

    res.status(201).json({
      success: true,
      data: {
        id: conversationId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get conversation history
 */
export const getConversationHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureInitialized();

    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
    }

    const history = await embeddingService.getConversationHistory(sessionId, limit);

    res.json({
      success: true,
      data: {
        sessionId,
        messages: history,
        count: history.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get embedding statistics
 */
export const getEmbeddingStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureInitialized();

    const stats = await embeddingService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cleanup expired cache
 */
export const cleanupCache = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureInitialized();

    const deletedCount = await embeddingService.cleanupCache();

    res.json({
      success: true,
      data: {
        deletedCount,
        message: `Cleaned up ${deletedCount} expired cache entries`,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
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
};
