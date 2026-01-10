/**
 * E2E Test Setup
 */
import { config } from 'dotenv';

// Load environment variables
config();

// Configuration
export const TEST_CONFIG = {
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:2048',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:2047',
  HEADLESS: process.env.HEADLESS !== 'false',
  TIMEOUT: parseInt(process.env.TEST_TIMEOUT || '30000', 10),
};

// Test data
export const TEST_USER = {
  email: `e2e-test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  name: 'E2E Test User',
  organization: 'E2E Test Organization',
};

// Global setup
beforeAll(async () => {
  console.log('🚀 Starting E2E Tests');
  console.log(`   Frontend URL: ${TEST_CONFIG.FRONTEND_URL}`);
  console.log(`   Backend URL: ${TEST_CONFIG.BACKEND_URL}`);
  console.log(`   Headless: ${TEST_CONFIG.HEADLESS}`);
});

afterAll(async () => {
  console.log('✅ E2E Tests Completed');
});

// Increase timeout for E2E tests
jest.setTimeout(TEST_CONFIG.TIMEOUT);
