import { Pool } from 'pg';
import crypto from 'crypto';

// Types for embedding operations
interface EmbeddingModel {
  id: string;
  name: string;
  provider: 'openai' | 'azure' | 'cohere' | 'huggingface' | 'local';
  modelName: string;
  dimensions: number;
  maxTokens: number;
  apiEndpoint?: string;
  settings: Record<string, unknown>;
}

interface DocumentEmbedding {
  id?: string;
  projectId?: string;
  sourceType: 'report' | 'activity' | 'regulation' | 'guideline' | 'custom';
  sourceId?: string;
  sourceUrl?: string;
  title?: string;
  content: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  language?: string;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  sourceId: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

interface SimilarActivity {
  activityId: string;
  activityName: string;
  scope: string;
  similarity: number;
}

interface EmissionFactorSuggestion {
  emissionFactorId: string;
  factorName: string;
  category: string;
  factorValue: number;
  factorUnit: string;
  similarity: number;
}

// Embedding service configuration
interface EmbeddingServiceConfig {
  openaiApiKey?: string;
  azureEndpoint?: string;
  azureApiKey?: string;
  defaultModel?: string;
}

export class EmbeddingService {
  private pool: Pool;
  private config: EmbeddingServiceConfig;
  private activeModel: EmbeddingModel | null = null;

  constructor(pool: Pool, config: EmbeddingServiceConfig = {}) {
    this.pool = pool;
    this.config = config;
  }

  /**
   * Initialize the service and load active embedding model
   */
  async initialize(): Promise<void> {
    const modelName = this.config.defaultModel || 'openai-ada-002';
    const result = await this.pool.query(
      'SELECT * FROM embedding_models WHERE name = $1 AND is_active = TRUE',
      [modelName]
    );
    
    if (result.rows.length > 0) {
      this.activeModel = this.mapModelRow(result.rows[0]);
    }
  }

  /**
   * Generate embedding vector for text using configured provider
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.activeModel) {
      throw new Error('No active embedding model configured');
    }

    switch (this.activeModel.provider) {
      case 'openai':
        return this.generateOpenAIEmbedding(text);
      case 'azure':
        return this.generateAzureEmbedding(text);
      default:
        throw new Error(`Unsupported embedding provider: ${this.activeModel.provider}`);
    }
  }

  /**
   * Generate embedding using OpenAI API
   */
  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: this.activeModel!.modelName,
        input: text.slice(0, this.activeModel!.maxTokens * 4), // Approximate token limit
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } };
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return data.data[0].embedding;
  }

  /**
   * Generate embedding using Azure OpenAI API
   */
  private async generateAzureEmbedding(text: string): Promise<number[]> {
    if (!this.config.azureEndpoint || !this.config.azureApiKey) {
      throw new Error('Azure OpenAI endpoint or API key not configured');
    }

    const url = `${this.config.azureEndpoint}/openai/deployments/${this.activeModel!.modelName}/embeddings?api-version=2024-02-01`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.config.azureApiKey,
      },
      body: JSON.stringify({
        input: text.slice(0, this.activeModel!.maxTokens * 4),
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } };
      throw new Error(`Azure OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return data.data[0].embedding;
  }

  /**
   * Store document with embedding for RAG
   */
  async storeDocument(doc: DocumentEmbedding): Promise<string> {
    const contentHash = crypto.createHash('sha256').update(doc.content).digest('hex');
    
    // Check for duplicate
    const existing = await this.pool.query(
      'SELECT id FROM document_embeddings WHERE content_hash = $1',
      [contentHash]
    );
    
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    // Generate embedding
    const embedding = await this.generateEmbedding(doc.content);
    const embeddingStr = `[${embedding.join(',')}]`;

    // Store document with embedding
    const result = await this.pool.query(
      `INSERT INTO document_embeddings (
        project_id, source_type, source_id, source_url, title, content,
        content_hash, embedding, embedding_model_id, metadata, tags, language,
        processed_at, token_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, $9, $10, $11, $12, NOW(), $13)
      RETURNING id`,
      [
        doc.projectId,
        doc.sourceType,
        doc.sourceId,
        doc.sourceUrl,
        doc.title,
        doc.content,
        contentHash,
        embeddingStr,
        this.activeModel?.id,
        JSON.stringify(doc.metadata || {}),
        doc.tags || [],
        doc.language || 'en',
        Math.ceil(doc.content.length / 4), // Approximate token count
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Store activity embedding for semantic search
   */
  async storeActivityEmbedding(activityId: string, searchableContent: string): Promise<void> {
    const embedding = await this.generateEmbedding(searchableContent);
    const embeddingStr = `[${embedding.join(',')}]`;

    await this.pool.query(
      `INSERT INTO activity_embeddings (activity_id, embedding, embedding_model_id, searchable_content)
       VALUES ($1, $2::vector, $3, $4)
       ON CONFLICT (activity_id) DO UPDATE SET
         embedding = $2::vector,
         embedding_model_id = $3,
         searchable_content = $4,
         processed_at = NOW()`,
      [activityId, embeddingStr, this.activeModel?.id, searchableContent]
    );
  }

  /**
   * Store emission factor embedding for intelligent matching
   */
  async storeEmissionFactorEmbedding(emissionFactorId: string, searchableContent: string): Promise<void> {
    const embedding = await this.generateEmbedding(searchableContent);
    const embeddingStr = `[${embedding.join(',')}]`;

    await this.pool.query(
      `INSERT INTO emission_factor_embeddings (emission_factor_id, embedding, embedding_model_id, searchable_content)
       VALUES ($1, $2::vector, $3, $4)
       ON CONFLICT (emission_factor_id) DO UPDATE SET
         embedding = $2::vector,
         embedding_model_id = $3,
         searchable_content = $4,
         processed_at = NOW()`,
      [emissionFactorId, embeddingStr, this.activeModel?.id, searchableContent]
    );
  }

  /**
   * Search documents by semantic similarity
   */
  async searchDocuments(
    query: string,
    options: {
      threshold?: number;
      limit?: number;
      projectId?: string;
      sourceType?: string;
    } = {}
  ): Promise<SearchResult[]> {
    const { threshold = 0.7, limit = 10, projectId, sourceType } = options;

    // Check cache first
    const queryHash = crypto.createHash('sha256').update(query).digest('hex');
    const cached = await this.pool.query(
      `SELECT results FROM semantic_search_cache 
       WHERE query_hash = $1 AND expires_at > NOW()`,
      [queryHash]
    );

    if (cached.rows.length > 0) {
      // Update hit count
      await this.pool.query(
        'UPDATE semantic_search_cache SET hit_count = hit_count + 1 WHERE query_hash = $1',
        [queryHash]
      );
      return cached.rows[0].results;
    }

    // Generate query embedding
    const embedding = await this.generateEmbedding(query);
    const embeddingStr = `[${embedding.join(',')}]`;

    // Search using pgvector
    const result = await this.pool.query(
      `SELECT * FROM search_documents($1::vector, $2, $3, $4, $5)`,
      [embeddingStr, threshold, limit, projectId, sourceType]
    );

    const results = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      sourceType: row.source_type,
      sourceId: row.source_id,
      similarity: row.similarity,
      metadata: row.metadata,
    }));

    // Cache results for 1 hour
    await this.pool.query(
      `INSERT INTO semantic_search_cache (query_hash, query_text, query_embedding, results, result_count, expires_at)
       VALUES ($1, $2, $3::vector, $4, $5, NOW() + INTERVAL '1 hour')
       ON CONFLICT (query_hash) DO UPDATE SET
         results = $4,
         result_count = $5,
         expires_at = NOW() + INTERVAL '1 hour',
         hit_count = semantic_search_cache.hit_count + 1`,
      [queryHash, query, embeddingStr, JSON.stringify(results), results.length]
    );

    return results;
  }

  /**
   * Find similar activities
   */
  async findSimilarActivities(query: string, limit: number = 5): Promise<SimilarActivity[]> {
    const embedding = await this.generateEmbedding(query);
    const embeddingStr = `[${embedding.join(',')}]`;

    const result = await this.pool.query(
      `SELECT * FROM find_similar_activities($1::vector, $2)`,
      [embeddingStr, limit]
    );

    return result.rows.map(row => ({
      activityId: row.activity_id,
      activityName: row.activity_name,
      scope: row.scope,
      similarity: row.similarity,
    }));
  }

  /**
   * Suggest emission factors based on activity description
   */
  async suggestEmissionFactors(description: string, limit: number = 5): Promise<EmissionFactorSuggestion[]> {
    const embedding = await this.generateEmbedding(description);
    const embeddingStr = `[${embedding.join(',')}]`;

    const result = await this.pool.query(
      `SELECT * FROM suggest_emission_factors($1::vector, $2)`,
      [embeddingStr, limit]
    );

    return result.rows.map(row => ({
      emissionFactorId: row.emission_factor_id,
      factorName: row.factor_name,
      category: row.category,
      factorValue: parseFloat(row.factor_value),
      factorUnit: row.factor_unit,
      similarity: row.similarity,
    }));
  }

  /**
   * Store conversation for RAG learning
   */
  async storeConversation(
    userId: string,
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata: {
      projectId?: string;
      modelName?: string;
      modelProvider?: string;
      promptTokens?: number;
      completionTokens?: number;
      responseTimeMs?: number;
    } = {}
  ): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO llm_conversations (
        user_id, project_id, session_id, role, content,
        model_name, model_provider, prompt_tokens, completion_tokens,
        total_tokens, response_time_ms, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        userId,
        metadata.projectId,
        sessionId,
        role,
        content,
        metadata.modelName,
        metadata.modelProvider,
        metadata.promptTokens,
        metadata.completionTokens,
        (metadata.promptTokens || 0) + (metadata.completionTokens || 0),
        metadata.responseTimeMs,
        JSON.stringify({}),
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId: string, limit: number = 50): Promise<Array<{
    role: string;
    content: string;
    createdAt: Date;
  }>> {
    const result = await this.pool.query(
      `SELECT role, content, created_at FROM llm_conversations
       WHERE session_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [sessionId, limit]
    );

    return result.rows.map(row => ({
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    }));
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupCache(): Promise<number> {
    const result = await this.pool.query(
      'DELETE FROM semantic_search_cache WHERE expires_at < NOW()'
    );
    return result.rowCount || 0;
  }

  /**
   * Get embedding statistics
   */
  async getStats(): Promise<{
    documentCount: number;
    activityEmbeddingCount: number;
    emissionFactorEmbeddingCount: number;
    conversationCount: number;
    cacheHitRate: number;
  }> {
    const stats = await this.pool.query(`
      SELECT
        (SELECT COUNT(*) FROM document_embeddings) as document_count,
        (SELECT COUNT(*) FROM activity_embeddings) as activity_embedding_count,
        (SELECT COUNT(*) FROM emission_factor_embeddings) as ef_embedding_count,
        (SELECT COUNT(*) FROM llm_conversations) as conversation_count,
        (SELECT COALESCE(AVG(hit_count), 0) FROM semantic_search_cache) as avg_cache_hits
    `);

    const row = stats.rows[0];
    return {
      documentCount: parseInt(row.document_count),
      activityEmbeddingCount: parseInt(row.activity_embedding_count),
      emissionFactorEmbeddingCount: parseInt(row.ef_embedding_count),
      conversationCount: parseInt(row.conversation_count),
      cacheHitRate: parseFloat(row.avg_cache_hits),
    };
  }

  private mapModelRow(row: Record<string, unknown>): EmbeddingModel {
    return {
      id: row.id as string,
      name: row.name as string,
      provider: row.provider as EmbeddingModel['provider'],
      modelName: row.model_name as string,
      dimensions: row.dimensions as number,
      maxTokens: row.max_tokens as number,
      apiEndpoint: row.api_endpoint as string | undefined,
      settings: row.settings as Record<string, unknown>,
    };
  }
}

export default EmbeddingService;
