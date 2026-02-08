/**
 * Embedding Service Complete Tests
 * Covers all 13 public methods of EmbeddingService class
 */
import { Pool } from 'pg';
import { EmbeddingService } from '../../src/services/embeddingService';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Create mock pool
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
  connect: jest.fn(),
  end: jest.fn(),
} as unknown as Pool;

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockFetch.mockReset();
    service = new EmbeddingService(mockPool, {
      openaiApiKey: 'test-openai-key',
      azureEndpoint: 'https://test.openai.azure.com',
      azureApiKey: 'test-azure-key',
      defaultModel: 'openai-ada-002',
    });
  });

  // ======================== initialize ========================
  describe('initialize', () => {
    it('should load active embedding model from database', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'model-1', name: 'openai-ada-002', provider: 'openai',
          model_name: 'text-embedding-ada-002', dimensions: 1536,
          max_tokens: 8191, api_endpoint: null, settings: {},
        }],
        rowCount: 1,
      });

      await service.initialize();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('embedding_models'),
        ['openai-ada-002']
      );
    });

    it('should handle no active model found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.initialize();

      // Should not throw, just have null model
    });
  });

  // ======================== generateEmbedding ========================
  describe('generateEmbedding', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'model-1', name: 'openai-ada-002', provider: 'openai',
          model_name: 'text-embedding-ada-002', dimensions: 1536,
          max_tokens: 8191, api_endpoint: null, settings: {},
        }],
        rowCount: 1,
      });
      await service.initialize();
    });

    it('should generate embedding via OpenAI', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
      });

      const result = await service.generateEmbedding('test text');

      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer test-openai-key' }),
        }),
      );
    });

    it('should throw on OpenAI API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Rate limited' } }),
      });

      await expect(service.generateEmbedding('test'))
        .rejects.toThrow('OpenAI API error: Rate limited');
    });

    it('should throw when no active model configured', async () => {
      const noModelService = new EmbeddingService(mockPool, {});
      // Don't initialize - no model

      await expect(noModelService.generateEmbedding('test'))
        .rejects.toThrow('No active embedding model configured');
    });
  });

  // ======================== Azure embedding ========================
  describe('generateAzureEmbedding', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'model-2', name: 'azure-ada', provider: 'azure',
          model_name: 'text-embedding-ada-002', dimensions: 1536,
          max_tokens: 8191, api_endpoint: 'https://test.openai.azure.com',
          settings: {},
        }],
        rowCount: 1,
      });
      await service.initialize();
    });

    it('should generate embedding via Azure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ embedding: [0.4, 0.5] }] }),
      });

      const result = await service.generateEmbedding('azure test');

      expect(result).toEqual([0.4, 0.5]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('openai.azure.com'),
        expect.objectContaining({
          headers: expect.objectContaining({ 'api-key': 'test-azure-key' }),
        }),
      );
    });

    it('should throw on Azure API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: 'Forbidden' } }),
      });

      await expect(service.generateEmbedding('test'))
        .rejects.toThrow('Azure OpenAI API error: Forbidden');
    });
  });

  // ======================== Unsupported provider ========================
  describe('unsupported provider', () => {
    it('should throw for unsupported provider', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'model-3', name: 'custom', provider: 'huggingface',
          model_name: 'bge-small', dimensions: 384,
          max_tokens: 512, api_endpoint: null, settings: {},
        }],
        rowCount: 1,
      });
      await service.initialize();

      await expect(service.generateEmbedding('test'))
        .rejects.toThrow('Unsupported embedding provider: huggingface');
    });
  });

  // ======================== storeDocument ========================
  describe('storeDocument', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'm1', name: 'openai-ada-002', provider: 'openai', model_name: 'text-embedding-ada-002', dimensions: 1536, max_tokens: 8191, settings: {} }],
        rowCount: 1,
      });
      await service.initialize();
    });

    it('should store new document with embedding', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // no existing
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ embedding: [0.1, 0.2] }] }),
      });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'doc-1' }], rowCount: 1 }); // INSERT

      const id = await service.storeDocument({
        content: 'Test document content',
        sourceType: 'report',
        projectId: 'proj-1',
        title: 'Report 1',
      });

      expect(id).toBe('doc-1');
    });

    it('should return existing document ID if content hash matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-doc' }], rowCount: 1 });

      const id = await service.storeDocument({
        content: 'Duplicate content',
        sourceType: 'guideline',
      });

      expect(id).toBe('existing-doc');
      expect(mockFetch).not.toHaveBeenCalled(); // No embedding generated
    });
  });

  // ======================== storeActivityEmbedding ========================
  describe('storeActivityEmbedding', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'm1', name: 'openai-ada-002', provider: 'openai', model_name: 'ada-002', dimensions: 1536, max_tokens: 8191, settings: {} }],
        rowCount: 1,
      });
      await service.initialize();
    });

    it('should store activity embedding with upsert', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ embedding: [0.1] }] }),
      });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await service.storeActivityEmbedding('act-1', 'Diesel combustion 5000 liters');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array)
      );
    });
  });

  // ======================== storeEmissionFactorEmbedding ========================
  describe('storeEmissionFactorEmbedding', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'm1', name: 'openai-ada-002', provider: 'openai', model_name: 'ada-002', dimensions: 1536, max_tokens: 8191, settings: {} }],
        rowCount: 1,
      });
      await service.initialize();
    });

    it('should store emission factor embedding with upsert', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ embedding: [0.5] }] }),
      });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await service.storeEmissionFactorEmbedding('ef-1', 'Natural gas combustion factor');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('emission_factor_embeddings'),
        expect.any(Array)
      );
    });
  });

  // ======================== searchDocuments ========================
  describe('searchDocuments', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'm1', name: 'openai-ada-002', provider: 'openai', model_name: 'ada-002', dimensions: 1536, max_tokens: 8191, settings: {} }],
        rowCount: 1,
      });
      await service.initialize();
    });

    it('should return cached results when available', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ results: [{ id: 'd1', title: 'Cached', content: 'c', sourceType: 'report', sourceId: 's', similarity: 0.9, metadata: {} }] }],
        rowCount: 1,
      }); // cache hit
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // update hit_count

      const results = await service.searchDocuments('GHG protocol');

      expect(results[0].title).toBe('Cached');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should search and cache when no cache hit', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // cache miss
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ embedding: [0.1] }] }),
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'd1', title: 'GHG Guide', content: 'text', source_type: 'guideline', source_id: 's1', similarity: 0.85, metadata: {} }],
        rowCount: 1,
      }); // search
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // cache insert

      const results = await service.searchDocuments('GHG protocol');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('GHG Guide');
    });

    it('should respect search options', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockFetch.mockResolvedValueOnce({
        ok: true, json: async () => ({ data: [{ embedding: [0.1] }] }),
      });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await service.searchDocuments('test', {
        threshold: 0.8, limit: 5, projectId: 'proj-1', sourceType: 'report',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('search_documents'),
        expect.arrayContaining([0.8, 5, 'proj-1', 'report'])
      );
    });
  });

  // ======================== findSimilarActivities ========================
  describe('findSimilarActivities', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'm1', name: 'openai-ada-002', provider: 'openai', model_name: 'ada-002', dimensions: 1536, max_tokens: 8191, settings: {} }],
        rowCount: 1,
      });
      await service.initialize();
    });

    it('should return similar activities', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true, json: async () => ({ data: [{ embedding: [0.1] }] }),
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          { activity_id: 'a1', activity_name: 'Diesel', scope: 'scope1', similarity: 0.95 },
          { activity_id: 'a2', activity_name: 'LPG', scope: 'scope1', similarity: 0.88 },
        ],
        rowCount: 2,
      });

      const results = await service.findSimilarActivities('diesel combustion', 5);

      expect(results).toHaveLength(2);
      expect(results[0].activityName).toBe('Diesel');
    });
  });

  // ======================== suggestEmissionFactors ========================
  describe('suggestEmissionFactors', () => {
    beforeEach(async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'm1', name: 'openai-ada-002', provider: 'openai', model_name: 'ada-002', dimensions: 1536, max_tokens: 8191, settings: {} }],
        rowCount: 1,
      });
      await service.initialize();
    });

    it('should suggest emission factors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true, json: async () => ({ data: [{ embedding: [0.1] }] }),
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          emission_factor_id: 'ef-1', factor_name: 'Diesel',
          category: 'fuel', factor_value: '2.68', factor_unit: 'kgCO2/L', similarity: 0.92,
        }],
        rowCount: 1,
      });

      const results = await service.suggestEmissionFactors('diesel fuel combustion');

      expect(results).toHaveLength(1);
      expect(results[0].factorValue).toBe(2.68);
    });
  });

  // ======================== storeConversation ========================
  describe('storeConversation', () => {
    it('should store a conversation message', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'conv-1' }], rowCount: 1 });

      const id = await service.storeConversation(
        'user-1', 'session-1', 'user', 'What are scope 1 emissions?',
        { projectId: 'proj-1', modelName: 'gpt-4', promptTokens: 10, completionTokens: 50 }
      );

      expect(id).toBe('conv-1');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('llm_conversations'),
        expect.arrayContaining(['user-1', 'proj-1', 'session-1', 'user'])
      );
    });

    it('should handle empty metadata', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'conv-2' }], rowCount: 1 });

      const id = await service.storeConversation('u1', 's1', 'assistant', 'Hello');

      expect(id).toBe('conv-2');
    });
  });

  // ======================== getConversationHistory ========================
  describe('getConversationHistory', () => {
    it('should return conversation messages', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { role: 'user', content: 'Hello', created_at: new Date() },
          { role: 'assistant', content: 'Hi!', created_at: new Date() },
        ],
        rowCount: 2,
      });

      const history = await service.getConversationHistory('session-1');

      expect(history).toHaveLength(2);
      expect(history[0].role).toBe('user');
    });
  });

  // ======================== cleanupCache ========================
  describe('cleanupCache', () => {
    it('should delete expired cache entries', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 5 });

      const deleted = await service.cleanupCache();

      expect(deleted).toBe(5);
    });

    it('should return 0 when no expired entries', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const deleted = await service.cleanupCache();

      expect(deleted).toBe(0);
    });
  });

  // ======================== getStats ========================
  describe('getStats', () => {
    it('should return embedding statistics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          document_count: '150',
          activity_embedding_count: '200',
          ef_embedding_count: '50',
          conversation_count: '1000',
          avg_cache_hits: '3.5',
        }],
        rowCount: 1,
      });

      const stats = await service.getStats();

      expect(stats.documentCount).toBe(150);
      expect(stats.activityEmbeddingCount).toBe(200);
      expect(stats.emissionFactorEmbeddingCount).toBe(50);
      expect(stats.conversationCount).toBe(1000);
      expect(stats.cacheHitRate).toBe(3.5);
    });
  });

  // ======================== Missing API key scenarios ========================
  describe('missing API keys', () => {
    it('should throw when OpenAI key not configured', async () => {
      const svc = new EmbeddingService(mockPool, {});
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'm1', name: 'openai-ada-002', provider: 'openai', model_name: 'ada-002', dimensions: 1536, max_tokens: 8191, settings: {} }],
        rowCount: 1,
      });
      await svc.initialize();

      await expect(svc.generateEmbedding('test'))
        .rejects.toThrow('OpenAI API key not configured');
    });

    it('should throw when Azure config not set', async () => {
      const svc = new EmbeddingService(mockPool, {});
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'm2', name: 'azure', provider: 'azure', model_name: 'ada-002', dimensions: 1536, max_tokens: 8191, settings: {} }],
        rowCount: 1,
      });
      await svc.initialize();

      await expect(svc.generateEmbedding('test'))
        .rejects.toThrow('Azure OpenAI endpoint or API key not configured');
    });
  });
});
