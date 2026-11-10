import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { requestLogger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { globalApiLimiter } from './middleware/rateLimit';
import routes from './routes';

// Create Express application
const app: Application = express();

// Keep nested query filters (Express 5 defaults to the simple parser).
app.set('query parser', 'extended');

// Trust proxy for accurate client IPs behind Docker/nginx
if (config.trustProxy) {
  app.set('trust proxy', 1);
}

// Security middleware — hardened Helmet defaults.
// API responses are JSON; deny-all CSP still stops a reflected HTML payload.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// CORS configuration — explicit allowlist only
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser / same-origin requests without Origin header
    if (!origin) return callback(null, true);
    if (config.cors.origin.includes(origin) || config.cors.origin.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 600,
}));

// Body parsing middleware — tighter default limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', globalApiLimiter);

// Request logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(requestLogger);
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;
