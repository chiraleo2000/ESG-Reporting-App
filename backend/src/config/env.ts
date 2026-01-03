import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Environment schema validation
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  HOST: z.string().default('0.0.0.0'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_POOL_MIN: z.string().default('2'),
  DATABASE_POOL_MAX: z.string().default('10'),
  
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_TTL_SECONDS: z.string().default('86400'), // 24 hours
  
  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // SERPAPI
  SERPAPI_KEY: z.string().optional(),
  SERPAPI_TIMEOUT_MS: z.string().default('10000'),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  
  // File Upload
  MAX_FILE_SIZE_MB: z.string().default('100'),
  UPLOAD_DIR: z.string().default('./uploads'),
  
  // Grid EF Updates
  YEARLY_GRID_EF_UPDATE_SCHEDULE: z.string().default('0 0 15 1 *'), // Jan 15 yearly
  GRID_EF_API_URL: z.string().optional(),
  GRID_EF_API_KEY: z.string().optional(),
  
  // Audit Trail
  AUDIT_LOG_RETENTION_DAYS: z.string().default('2555'), // 7 years
  AUDIT_CLEANUP_SCHEDULE: z.string().default('0 0 1 * *'), // Monthly
  
  // Signatures
  SIGNATURE_AUTHORIZED_ROLES: z.string().default('owner,director,auditor'),
  SIGNATURE_SECRET: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),
});

// Parse and validate environment
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('\n');
      throw new Error(`Environment validation failed:\n${missingVars}`);
    }
    throw error;
  }
};

const env = parseEnv();

// Configuration object
export const config = {
  // Server
  nodeEnv: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  host: env.HOST,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  
  // Database
  database: {
    url: env.DATABASE_URL,
    poolMin: parseInt(env.DATABASE_POOL_MIN, 10),
    poolMax: parseInt(env.DATABASE_POOL_MAX, 10),
  },
  
  // Redis
  redis: {
    url: env.REDIS_URL,
    ttlSeconds: parseInt(env.REDIS_TTL_SECONDS, 10),
  },
  
  // Authentication
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  
  // SERPAPI
  serpapi: {
    key: env.SERPAPI_KEY,
    timeoutMs: parseInt(env.SERPAPI_TIMEOUT_MS, 10),
  },
  
  // CORS
  cors: {
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  },
  
  // File Upload
  upload: {
    maxFileSizeMB: parseInt(env.MAX_FILE_SIZE_MB, 10),
    maxFileSizeBytes: parseInt(env.MAX_FILE_SIZE_MB, 10) * 1024 * 1024,
    uploadDir: env.UPLOAD_DIR,
    allowedTypes: ['.xlsx', '.csv', '.xls'],
  },
  
  // Grid EF Updates
  gridEF: {
    updateSchedule: env.YEARLY_GRID_EF_UPDATE_SCHEDULE,
    apiUrl: env.GRID_EF_API_URL,
    apiKey: env.GRID_EF_API_KEY,
    significantChangeThreshold: 0.05, // 5%
  },
  
  // Audit Trail
  audit: {
    retentionDays: parseInt(env.AUDIT_LOG_RETENTION_DAYS, 10),
    cleanupSchedule: env.AUDIT_CLEANUP_SCHEDULE,
  },
  
  // Signatures
  signature: {
    authorizedRoles: env.SIGNATURE_AUTHORIZED_ROLES.split(',').map((r) => r.trim()),
    secret: env.SIGNATURE_SECRET,
  },
  
  // Logging
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },
  
  // Standards configuration
  standards: {
    EU_CBAM: {
      id: 'EU_CBAM',
      name: 'EU Carbon Border Adjustment Mechanism',
      country: 'EU',
      requiresSignature: false,
      requiresAuditTrail: false,
    },
    UK_CBAM: {
      id: 'UK_CBAM',
      name: 'UK Carbon Border Adjustment Mechanism',
      country: 'UK',
      requiresSignature: false,
      requiresAuditTrail: false,
    },
    CHINA_CARBON: {
      id: 'CHINA_CARBON',
      name: 'China Carbon Market',
      country: 'CN',
      requiresSignature: false,
      requiresAuditTrail: false,
    },
    JAPAN_MAFF: {
      id: 'JAPAN_MAFF',
      name: 'Japan MAFF ESG Guidelines',
      country: 'JP',
      requiresSignature: true,
      requiresAuditTrail: true,
    },
    KOREA_KESG: {
      id: 'KOREA_KESG',
      name: 'Korea K-ESG Disclosure',
      country: 'KR',
      requiresSignature: true,
      requiresAuditTrail: true,
    },
    THAILAND_ESG: {
      id: 'THAILAND_ESG',
      name: 'Thailand Thai-ESG',
      country: 'TH',
      requiresSignature: false,
      requiresAuditTrail: false,
    },
  },
  
  // Tier 2+ multiplier (not customizable)
  tier2PlusMultiplier: 1.3,
  
  // Report generation
  reports: {
    estimatedSecondsPerReport: 60,
    maxConcurrentGenerations: 3,
    expirationDays: 30,
  },
} as const;

export type Config = typeof config;
export default config;
