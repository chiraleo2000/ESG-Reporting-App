/**
 * REST API Connector
 * 
 * Fetches emission data from external REST APIs (ERP, IoT platforms, 
 * government databases, etc.) with configurable authentication,
 * retry logic, and field mapping.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger';
import type { IDataConnector } from './types';

export interface RestApiConfig {
  baseUrl: string;
  authType: 'none' | 'bearer' | 'api_key' | 'basic' | 'oauth2';
  authToken?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  username?: string;
  password?: string;
  oauth2?: {
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope?: string;
  };
  headers?: Record<string, string>;
  endpoints: {
    activities?: string;
    emissionFactors?: string;
    custom?: string;
  };
  timeout?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
  pagination?: {
    type: 'offset' | 'cursor' | 'page';
    limitParam?: string;
    offsetParam?: string;
    cursorParam?: string;
    pageParam?: string;
    defaultLimit?: number;
  };
  responseDataPath?: string; // JSONPath-like dot notation to data array in response
}

export class RestApiConnector implements IDataConnector {
  private client: AxiosInstance | null = null;
  private config: RestApiConfig | null = null;

  async connect(config: Record<string, any>): Promise<boolean> {
    try {
      this.config = config as RestApiConfig;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...this.config.headers,
      };

      const axiosConfig: AxiosRequestConfig = {
        baseURL: this.config.baseUrl,
        timeout: this.config.timeout || 30000,
      };

      // Configure authentication
      switch (this.config.authType) {
        case 'bearer':
          if (this.config.authToken) {
            headers['Authorization'] = `Bearer ${this.config.authToken}`;
          }
          break;
        case 'api_key':
          if (this.config.apiKey) {
            const headerName = this.config.apiKeyHeader || 'X-API-Key';
            headers[headerName] = this.config.apiKey;
          }
          break;
        case 'basic':
          if (this.config.username && this.config.password) {
            axiosConfig.auth = {
              username: this.config.username,
              password: this.config.password,
            };
          }
          break;
        case 'oauth2':
          if (this.config.oauth2) {
            const token = await this.getOAuth2Token(this.config.oauth2);
            headers['Authorization'] = `Bearer ${token}`;
          }
          break;
      }

      axiosConfig.headers = headers;

      this.client = axios.create(axiosConfig);
      
      // Test connection with a HEAD request to the base URL
      await this.client.head('/');
      logger.info(`REST API connected: ${this.config.baseUrl}`);
      return true;
    } catch (error: any) {
      // Connection test may fail but that's okay - the base URL may not support HEAD
      if (this.client) {
        logger.info(`REST API client created for: ${this.config?.baseUrl} (health check skipped)`);
        return true;
      }
      logger.error('REST API connection failed:', error.message);
      return false;
    }
  }

  async fetchData(config: Record<string, any>): Promise<any[]> {
    if (!this.client || !this.config) {
      throw new Error('REST API connector not connected. Call connect() first.');
    }

    const endpoint = config.endpoint || this.config.endpoints?.activities || '/data';
    const retryAttempts = this.config.retryAttempts || 3;
    const retryDelay = this.config.retryDelayMs || 1000;
    let allData: any[] = [];

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        if (this.config.pagination) {
          allData = await this.fetchPaginated(endpoint);
        } else {
          const response = await this.client.get(endpoint, {
            params: config.params,
          });
          
          // Extract data from response using path
          allData = this.extractData(response.data);
        }
        
        logger.info(`REST API fetched ${allData.length} records from ${endpoint}`);
        return allData;
      } catch (error: any) {
        logger.warn(`REST API fetch attempt ${attempt}/${retryAttempts} failed:`, error.message);
        if (attempt < retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        } else {
          throw new Error(`REST API fetch failed after ${retryAttempts} attempts: ${error.message}`);
        }
      }
    }

    return allData;
  }

  async parseData(rawData: any[], mapping?: Record<string, string>): Promise<any[]> {
    if (!mapping || Object.keys(mapping).length === 0) {
      return rawData;
    }

    return rawData.map((item, index) => {
      try {
        const mapped: Record<string, any> = {};
        for (const [targetField, sourcePath] of Object.entries(mapping)) {
          mapped[targetField] = this.getNestedValue(item, sourcePath);
        }
        return mapped;
      } catch (error: any) {
        logger.warn(`Field mapping error at row ${index}:`, error.message);
        return null;
      }
    }).filter(Boolean);
  }

  async validate(data: any[]): Promise<{ valid: any[]; errors: any[] }> {
    const valid: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const itemErrors: string[] = [];

      // Basic validation: required fields for activity data
      if (!item.name && !item.activity_name && !item.description) {
        itemErrors.push('Missing activity name or description');
      }
      if (!item.scope && !item.emission_scope) {
        itemErrors.push('Missing emission scope');
      }
      if (item.quantity !== undefined && (typeof item.quantity !== 'number' || item.quantity < 0)) {
        itemErrors.push('Invalid quantity: must be a non-negative number');
      }

      if (itemErrors.length > 0) {
        errors.push({ row: i + 1, field: 'multiple', message: itemErrors.join('; ') });
      } else {
        valid.push(item);
      }
    }

    return { valid, errors };
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.config = null;
    logger.info('REST API connector disconnected');
  }

  // Private helpers

  private async getOAuth2Token(oauth2Config: NonNullable<RestApiConfig['oauth2']>): Promise<string> {
    const response = await axios.post(oauth2Config.tokenUrl, {
      grant_type: 'client_credentials',
      client_id: oauth2Config.clientId,
      client_secret: oauth2Config.clientSecret,
      scope: oauth2Config.scope,
    });
    return response.data.access_token;
  }

  private async fetchPaginated(endpoint: string): Promise<any[]> {
    if (!this.client || !this.config?.pagination) return [];

    const allData: any[] = [];
    const pagination = this.config.pagination;
    const limit = pagination.defaultLimit || 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const params: Record<string, any> = {};
      
      switch (pagination.type) {
        case 'offset':
          params[pagination.limitParam || 'limit'] = limit;
          params[pagination.offsetParam || 'offset'] = offset;
          break;
        case 'page':
          params[pagination.limitParam || 'limit'] = limit;
          params[pagination.pageParam || 'page'] = Math.floor(offset / limit) + 1;
          break;
      }

      const response = await this.client.get(endpoint, { params });
      const data = this.extractData(response.data);
      
      allData.push(...data);
      offset += limit;
      hasMore = data.length >= limit;

      // Safety limit
      if (allData.length > 10000) {
        logger.warn('REST API pagination safety limit reached (10000 records)');
        break;
      }
    }

    return allData;
  }

  private extractData(responseData: any): any[] {
    if (!this.config?.responseDataPath) {
      return Array.isArray(responseData) ? responseData : [responseData];
    }

    const value = this.getNestedValue(responseData, this.config.responseDataPath);
    return Array.isArray(value) ? value : [value];
  }

  private getNestedValue(obj: any, path: string): any {
    // Support JSONPath-like dot notation: "$.data.items" or "data.items"
    const cleanPath = path.replace(/^\$\.?/, '');
    return cleanPath.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }
}
