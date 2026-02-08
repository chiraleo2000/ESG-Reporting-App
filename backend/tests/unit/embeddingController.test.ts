/**
 * EmbeddingController Unit Tests
 * Covers: searchDocuments, storeDocument, findSimilarActivities,
 * suggestEmissionFactors, embedActivity, embedEmissionFactor,
 * storeConversation, getConversationHistory, getEmbeddingStats, cleanupCache
 */

// Mock the database pool
jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
  db: { query: jest.fn() },
}));

// Mock EmbeddingService
const mockEmbeddingService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  searchDocuments: jest.fn().mockResolvedValue([{ id: 'doc-1', content: 'test', score: 0.9 }]),
  storeDocument: jest.fn().mockResolvedValue('doc-1'),
  findSimilarActivities: jest.fn().mockResolvedValue([{ id: 'act-1', score: 0.85 }]),
  suggestEmissionFactors: jest.fn().mockResolvedValue([{ id: 'ef-1', score: 0.92 }]),
  storeActivityEmbedding: jest.fn().mockResolvedValue(undefined),
  storeEmissionFactorEmbedding: jest.fn().mockResolvedValue(undefined),
  storeConversation: jest.fn().mockResolvedValue('conv-1'),
  getConversationHistory: jest.fn().mockResolvedValue([{ role: 'user', content: 'test' }]),
  getStats: jest.fn().mockResolvedValue({ totalDocuments: 10, totalEmbeddings: 50 }),
  cleanupCache: jest.fn().mockResolvedValue(5),
};

jest.mock('../../src/services/embeddingService', () => ({
  EmbeddingService: jest.fn().mockImplementation(() => mockEmbeddingService),
}));

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
} from '../../src/controllers/embeddingController';

function mockRequest(overrides: any = {}): any {
  return {
    params: {},
    query: {},
    body: {},
    user: { id: 'user-1' },
    ...overrides,
  };
}

function mockResponse(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const nextFn = jest.fn();

describe('Embedding Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // searchDocuments
  // ==========================================================================
  describe('searchDocuments', () => {
    it('should search documents by query', async () => {
      const req = mockRequest({ body: { query: 'emission factors for steel' } });
      const res = mockResponse();

      await searchDocuments(req, res, nextFn);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          query: 'emission factors for steel',
          count: 1,
        }),
      }));
    });

    it('should return 400 when query is missing', async () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();

      await searchDocuments(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should call next on error', async () => {
      mockEmbeddingService.searchDocuments.mockRejectedValueOnce(new Error('Search error'));
      const req = mockRequest({ body: { query: 'test' } });
      const res = mockResponse();

      await searchDocuments(req, res, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // storeDocument
  // ==========================================================================
  describe('storeDocument', () => {
    it('should store a document', async () => {
      const req = mockRequest({
        body: { content: 'Test content', sourceType: 'report', title: 'Test Doc' },
      });
      const res = mockResponse();

      await storeDocument(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ id: 'doc-1' }),
      }));
    });

    it('should return 400 when content is missing', async () => {
      const req = mockRequest({ body: { sourceType: 'report' } });
      const res = mockResponse();

      await storeDocument(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 when sourceType is missing', async () => {
      const req = mockRequest({ body: { content: 'Test' } });
      const res = mockResponse();

      await storeDocument(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==========================================================================
  // findSimilarActivities
  // ==========================================================================
  describe('findSimilarActivities', () => {
    it('should find similar activities', async () => {
      const req = mockRequest({ body: { query: 'diesel combustion', limit: 5 } });
      const res = mockResponse();

      await findSimilarActivities(req, res, nextFn);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ count: 1 }),
      }));
    });

    it('should return 400 when query is missing', async () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();

      await findSimilarActivities(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==========================================================================
  // suggestEmissionFactors
  // ==========================================================================
  describe('suggestEmissionFactors', () => {
    it('should suggest emission factors', async () => {
      const req = mockRequest({ body: { description: 'natural gas heating', limit: 3 } });
      const res = mockResponse();

      await suggestEmissionFactors(req, res, nextFn);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ count: 1 }),
      }));
    });

    it('should return 400 when description is missing', async () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();

      await suggestEmissionFactors(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==========================================================================
  // embedActivity
  // ==========================================================================
  describe('embedActivity', () => {
    it('should embed an activity', async () => {
      const req = mockRequest({ body: { activityId: 'a-1', searchableContent: 'diesel gen' } });
      const res = mockResponse();

      await embedActivity(req, res, nextFn);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Activity embedded successfully',
      }));
    });

    it('should return 400 when fields missing', async () => {
      const req = mockRequest({ body: { activityId: 'a-1' } });
      const res = mockResponse();

      await embedActivity(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==========================================================================
  // embedEmissionFactor
  // ==========================================================================
  describe('embedEmissionFactor', () => {
    it('should embed an emission factor', async () => {
      const req = mockRequest({ body: { emissionFactorId: 'ef-1', searchableContent: 'diesel 2.68' } });
      const res = mockResponse();

      await embedEmissionFactor(req, res, nextFn);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Emission factor embedded successfully',
      }));
    });

    it('should return 400 when fields missing', async () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();

      await embedEmissionFactor(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==========================================================================
  // storeConversation
  // ==========================================================================
  describe('storeConversation', () => {
    it('should store a conversation message', async () => {
      const req = mockRequest({
        body: { sessionId: 's-1', role: 'user', content: 'Hello' },
        user: { id: 'user-1' },
      });
      const res = mockResponse();

      await storeConversation(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 401 when user not authenticated', async () => {
      const req = mockRequest({ body: { sessionId: 's-1', role: 'user', content: 'Hello' }, user: undefined });
      const res = mockResponse();

      await storeConversation(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 400 when required fields missing', async () => {
      const req = mockRequest({ body: { sessionId: 's-1' }, user: { id: 'u-1' } });
      const res = mockResponse();

      await storeConversation(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==========================================================================
  // getConversationHistory
  // ==========================================================================
  describe('getConversationHistory', () => {
    it('should return conversation history', async () => {
      const req = mockRequest({ params: { sessionId: 's-1' }, query: { limit: '20' } });
      const res = mockResponse();

      await getConversationHistory(req, res, nextFn);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ sessionId: 's-1', count: 1 }),
      }));
    });

    it('should return 400 when sessionId missing', async () => {
      const req = mockRequest({ params: {}, query: {} });
      const res = mockResponse();

      await getConversationHistory(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ==========================================================================
  // getEmbeddingStats
  // ==========================================================================
  describe('getEmbeddingStats', () => {
    it('should return embedding statistics', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await getEmbeddingStats(req, res, nextFn);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ totalDocuments: 10 }),
      }));
    });
  });

  // ==========================================================================
  // cleanupCache
  // ==========================================================================
  describe('cleanupCache', () => {
    it('should cleanup expired cache entries', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await cleanupCache(req, res, nextFn);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({ deletedCount: 5 }),
      }));
    });
  });
});
