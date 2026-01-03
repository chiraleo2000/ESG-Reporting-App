import app from './app';
import { config, db, cache } from './config';
import { logger } from './utils/logger';
import { initializeJobs, stopAllJobs } from './jobs';

const PORT = config.port;
const HOST = config.host;

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop scheduled jobs
    stopAllJobs();
    
    // Close database connections
    await db.close();
    
    // Close Redis connections
    await cache.close();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    // Test database connection (allow startup even if DB is unavailable in development)
    try {
      const dbHealthy = await db.healthCheck();
      if (dbHealthy) {
        logger.info('Database connection established');
      } else {
        logger.warn('Database not available - some features will be limited');
      }
    } catch (dbError) {
      if (config.isDevelopment) {
        logger.warn('Database not available - running in limited mode');
        logger.warn('To enable full functionality, start PostgreSQL and run the schema');
      } else {
        throw dbError;
      }
    }
    
    // Test Redis connection (optional - don't fail if Redis is unavailable)
    try {
      const redisHealthy = await cache.healthCheck();
      if (redisHealthy) {
        logger.info('Redis connection established');
      } else {
        logger.warn('Redis not available - caching disabled');
      }
    } catch {
      logger.warn('Redis not available - caching disabled');
    }
    
    // Start scheduled jobs
    if (!config.isTest) {
      initializeJobs();
      logger.info('Scheduled jobs started');
    }
    
    // Start HTTP server
    app.listen(PORT, HOST, () => {
      logger.info(`🚀 ESG Reporting API Server running on http://${HOST}:${PORT}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Health check: http://${HOST}:${PORT}/health`);
      logger.info(`API endpoints: http://${HOST}:${PORT}/api`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();
