// Test setup file
import { config } from 'dotenv';

// Load test environment
config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-unit-testing-32chars';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5434/esg_test';
process.env.REDIS_URL = 'redis://localhost:6379';

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      testUser: {
        email: string;
        password: string;
        token?: string;
      };
    }
  }
}

// Increase timeout for integration tests
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Allow connections to close
  await new Promise(resolve => setTimeout(resolve, 500));
});
