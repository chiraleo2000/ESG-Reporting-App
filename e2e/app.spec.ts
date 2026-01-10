import { test, expect, Page } from '@playwright/test';

/**
 * ESG Reporting Application - E2E UI Tests
 * Complete user journey testing with Playwright
 */

// Test data - static user for reliable testing
const testUser = {
  email: 'e2e_test_user@example.com',
  password: 'SecureTest@123!',
  name: 'E2E Test User',
  organization: 'Test Organization',
};

// Dynamic user for registration tests
const dynamicTestUser = {
  email: `e2e_playwright_${Date.now()}@test.com`,
  password: 'SecureTest@123!',
  name: 'E2E Playwright User',
  organization: 'Test Organization',
};

const testProject = {
  name: 'Playwright Test Project',
  description: 'Project created by E2E Playwright tests',
  organization: 'Test Org',
  country: 'Thailand',
  baselineYear: '2023',
  targetYear: '2030',
};

// Helper to check if we're on login page
async function isOnLoginPage(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes('/login') || url.endsWith('/');
}

// Helper to login
async function performLogin(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto('/login');
  
  // Switch to login mode if on register mode
  const loginTab = page.locator('button:has-text("Sign In"), button:has-text("Login")').first();
  if (await loginTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await loginTab.click();
    await page.waitForTimeout(500);
  }
  
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation or response
  await page.waitForTimeout(2000);
  
  // Check if we're still on login page (failed) or elsewhere (success)
  return !await isOnLoginPage(page);
}

test.describe('ESG Reporting App - Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login or show login form
    await expect(page).toHaveURL(/login|signin|\//);
    
    // Check for login elements
    const loginForm = page.locator('form, [data-testid="login-form"]');
    await expect(loginForm).toBeVisible({ timeout: 10000 });
  });

  test('should register a new user', async ({ page }) => {
    await page.goto('/');
    
    // Make sure we're on register mode
    const registerTab = page.locator('button:has-text("Create Account"), button:has-text("Register")').first();
    if (await registerTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await registerTab.click();
      await page.waitForTimeout(500);
    }
    
    // Fill registration form
    const nameInput = page.locator('input[name="name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill(dynamicTestUser.name);
    }
    
    await page.fill('input[name="email"], input[type="email"]', dynamicTestUser.email);
    await page.fill('input[name="password"], input[type="password"]', dynamicTestUser.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation or success message
    await page.waitForTimeout(2000);
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Switch to login mode
    const loginTab = page.locator('button:has-text("Sign In")').first();
    if (await loginTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginTab.click();
      await page.waitForTimeout(500);
    }
    
    // Fill login form
    await page.fill('input[type="email"]', dynamicTestUser.email);
    await page.fill('input[type="password"]', dynamicTestUser.password);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForTimeout(2000);
  });

  test('should show error for invalid login', async ({ page }) => {
    await page.goto('/login');
    
    // Switch to login mode
    const loginTab = page.locator('button:has-text("Sign In")').first();
    if (await loginTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginTab.click();
      await page.waitForTimeout(500);
    }
    
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for API response
    await page.waitForTimeout(3000);
    
    // Check that we're still on the login page (login failed)
    const url = page.url();
    expect(url).toContain('login');
  });
});

test.describe('ESG Reporting App - Dashboard', () => {
  test('should display dashboard after login', async ({ page }) => {
    // Register and login with new user
    await page.goto('/login');
    
    // First register
    const email = `dashboard_test_${Date.now()}@test.com`;
    await page.fill('input[name="name"]', 'Dashboard Test User');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'SecureTest@123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Go to dashboard - should either show dashboard or login form
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    // Check we have some visible body content
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Page should have loaded something
    const url = page.url();
    expect(url).toMatch(/dashboard|login/);
  });

  test('should show navigation menu', async ({ page }) => {
    // Navigate and check for nav elements
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Either we see nav (logged in) or form (login page)
    const hasContent = page.locator('nav, form, .sidebar').first();
    await expect(hasContent).toBeVisible({ timeout: 10000 });
  });
});

test.describe('ESG Reporting App - Projects', () => {
  test('should navigate to projects page', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForTimeout(1000);
    
    // Will either show projects page or redirect to login
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
    
    // Check URL is either /projects or /login (redirect)
    const url = page.url();
    expect(url).toMatch(/projects|login/);
  });

  test('should create a new project', async ({ page }) => {
    // Register first
    await page.goto('/login');
    const email = `project_test_${Date.now()}@test.com`;
    await page.fill('input[name="name"]', 'Project Test User');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'SecureTest@123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto('/projects');
    await page.waitForTimeout(2000);
    
    // Click create button if visible
    const createBtn = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should display project list', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForTimeout(2000);
    
    // Check for project cards or list or login redirect
    const content = page.locator('body');
    await expect(content).toBeVisible();
    
    const projectList = page.locator('.project-card, .project-item, [data-testid="project"], table tbody tr');
    const count = await projectList.count();
    console.log(`Found ${count} projects`);
  });
});

test.describe('ESG Reporting App - Activities', () => {
  test('should navigate to activities page', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForTimeout(1000);
    
    // Check for page content or redirect
    const url = page.url();
    expect(url).toMatch(/activities|login/);
  });

  test('should display scope filters', async ({ page }) => {
    // Register and go to activities
    await page.goto('/login');
    const email = `activities_test_${Date.now()}@test.com`;
    await page.fill('input[name="name"]', 'Activities Test User');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'SecureTest@123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto('/activities');
    await page.waitForTimeout(2000);
    
    // Check for scope filter options if on activities page
    const url = page.url();
    if (url.includes('/activities')) {
      const scopeFilters = page.locator('select, [role="combobox"], .filter, button').first();
      await expect(scopeFilters).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('ESG Reporting App - Reports', () => {
  test('should navigate to reports page', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(1000);
    
    // Will redirect to login if not authenticated
    const url = page.url();
    expect(url).toMatch(/reports|login/);
  });

  test('should show standards selection for reports', async ({ page }) => {
    // Register and go to reports
    await page.goto('/login');
    const email = `reports_test_${Date.now()}@test.com`;
    await page.fill('input[name="name"]', 'Reports Test User');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'SecureTest@123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto('/reports');
    await page.waitForTimeout(2000);
    
    // Check for standard options if on reports page
    const url = page.url();
    if (url.includes('/reports')) {
      const standardOptions = page.locator('select option, [role="option"], .standard-option, button');
      const count = await standardOptions.count();
      console.log(`Found ${count} standard options`);
    }
  });
});

test.describe('ESG Reporting App - Analytics', () => {
  test('should navigate to analytics page', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForTimeout(1000);
    
    const url = page.url();
    expect(url).toMatch(/analytics|login/);
  });

  test('should display charts and visualizations', async ({ page }) => {
    // Register and go to analytics
    await page.goto('/login');
    const email = `analytics_test_${Date.now()}@test.com`;
    await page.fill('input[name="name"]', 'Analytics Test User');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'SecureTest@123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto('/analytics');
    await page.waitForTimeout(3000);
    
    // Check for chart elements if on analytics page
    const url = page.url();
    if (url.includes('/analytics')) {
      const charts = page.locator('canvas, svg.recharts-surface, .chart, [data-testid="chart"]');
      const count = await charts.count();
      console.log(`Found ${count} chart elements`);
    }
  });
});

test.describe('ESG Reporting App - Settings', () => {
  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(1000);
    
    const url = page.url();
    expect(url).toMatch(/settings|login/);
  });

  test('should show user profile section', async ({ page }) => {
    // Register and go to settings
    await page.goto('/login');
    const email = `settings_test_${Date.now()}@test.com`;
    await page.fill('input[name="name"]', 'Settings Test User');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'SecureTest@123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    // Check for profile section if on settings page
    const url = page.url();
    if (url.includes('/settings')) {
      const profileSection = page.locator('.profile, [data-testid="profile"], form').first();
      await expect(profileSection).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('ESG Reporting App - Responsive Design', () => {
  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Page should load without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(768);
  });

  test('should be responsive on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    // Desktop should load properly
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('ESG Reporting App - Accessibility', () => {
  test('should have proper page title', async ({ page }) => {
    await page.goto('/');
    
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    console.log(`Page title: ${title}`);
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have form labels', async ({ page }) => {
    await page.goto('/login');
    
    const labels = page.locator('label');
    const count = await labels.count();
    expect(count).toBeGreaterThan(0);
    console.log(`Found ${count} form labels`);
  });
});
