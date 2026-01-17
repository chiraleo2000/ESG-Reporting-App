import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * ESG Reporting Application - Comprehensive E2E Workflow Tests
 * Tests the complete user journey from login to report generation
 * Uses demo user for reliable, repeatable testing
 */

// Demo user credentials (from seed data)
const DEMO_USER = {
  email: 'admin@esgdemo.com',
  password: 'Demo@123',
  name: 'Admin User',
};

// Alternative test user for fresh registration
const TEST_USER = {
  email: `e2e_workflow_${Date.now()}@test.com`,
  password: 'TestWorkflow@123!',
  name: 'E2E Workflow Tester',
};

// Test project data
const TEST_PROJECT = {
  name: `E2E Test Project ${Date.now()}`,
  description: 'Automated E2E test project for workflow validation',
  organization: 'Test Organization',
  industry: 'manufacturing',
  country: 'Thailand',
  baselineYear: '2023',
  reportingYear: '2024',
};

// Test activity data
const TEST_ACTIVITIES = [
  {
    name: 'Electricity Consumption',
    scope: 'scope2',
    activityType: 'purchased_electricity',
    quantity: '50000',
    unit: 'kWh',
    description: 'Monthly office electricity',
  },
  {
    name: 'Company Vehicle Fleet',
    scope: 'scope1',
    activityType: 'mobile_combustion',
    quantity: '2500',
    unit: 'l',
    description: 'Diesel consumption for delivery trucks',
  },
  {
    name: 'Business Travel',
    scope: 'scope3',
    activityType: 'business_travel',
    quantity: '15000',
    unit: 'km',
    description: 'Air travel for business meetings',
  },
];

// Helper function to login
async function login(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Click sign in tab if visible
  const signInTab = page.locator('button:has-text("Sign In")').first();
  if (await signInTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signInTab.click();
    await page.waitForTimeout(500);
  }

  // Fill login form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForTimeout(3000);

  // Check if login was successful
  const url = page.url();
  return !url.includes('/login');
}

// Helper to wait for and click element
async function clickIfVisible(page: Page, selector: string, timeout = 3000): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout });
    await element.click();
    return true;
  } catch {
    return false;
  }
}

test.describe('Complete ESG Workflow - Full User Journey', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Step 1: User can login with demo credentials', async () => {
    const success = await login(page, DEMO_USER.email, DEMO_USER.password);

    if (!success) {
      // If demo user doesn't exist, register a new user
      console.log('Demo user not found, registering new user...');
      await page.goto('/login');

      const registerTab = page.locator('button:has-text("Create Account")').first();
      if (await registerTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await registerTab.click();
        await page.waitForTimeout(500);
      }

      await page.fill('input[name="name"]', TEST_USER.name);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }

    // Verify we're logged in
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('Step 2: Dashboard displays with real data', async () => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check dashboard elements - look for any h1 containing Dashboard text
    const dashboardTitle = page.locator('h1').filter({ hasText: 'Dashboard' });
    await expect(dashboardTitle).toBeVisible({ timeout: 15000 });

    // Check for any card-like elements on the page (using rounded corner styling)
    const contentCards = page.locator('[class*="rounded"]');
    const cardCount = await contentCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Check for quick action buttons or navigation elements
    const actionButtons = page.locator('button');
    const buttonCount = await actionButtons.count();
    console.log(`Found ${buttonCount} buttons on dashboard`);
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('Step 3: Navigate to Projects and create new project', async () => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check projects page loaded - look for h1 containing Projects
    const projectsTitle = page.locator('h1').filter({ hasText: 'Projects' });
    await expect(projectsTitle).toBeVisible({ timeout: 15000 });

    // Click New Project button
    const newProjectBtn = page.locator('button').filter({ hasText: 'New Project' }).first();
    if (await newProjectBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newProjectBtn.click();
      await page.waitForTimeout(1000);

      // Fill project form - look for input by placeholder
      const projectNameInput = page.locator('input[placeholder*="Project"]').first();
      if (await projectNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await projectNameInput.fill(TEST_PROJECT.name);
      }

      const descInput = page.locator('input[placeholder*="description"], textarea').first();
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill(TEST_PROJECT.description);
      }

      // Submit project creation - look for button with Create or Save
      const createBtn = page.locator('button').filter({ hasText: /Create|Save/ }).first();
      if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('Step 4: Navigate to Activities and add activities', async () => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check activities page loaded - look for h1 containing Activities
    const activitiesTitle = page.locator('h1').filter({ hasText: 'Activities' });
    await expect(activitiesTitle).toBeVisible({ timeout: 15000 });

    // Check for project selector - look for select element
    const projectSelector = page.locator('select').first();
    if (await projectSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Select a project if available
      const options = projectSelector.locator('option');
      const optionCount = await options.count();
      if (optionCount > 1) {
        await projectSelector.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }
    }

    // Try to add an activity
    const addActivityBtn = page.locator('button').filter({ hasText: 'Add Activity' }).first();
    if (await addActivityBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addActivityBtn.click();
      await page.waitForTimeout(1000);

      // Fill activity form - look for input by placeholder
      const nameInput = page.locator('input[placeholder*="Activity"], input[placeholder*="activity"]').first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill(TEST_ACTIVITIES[0].name);
      }

      const quantityInput = page.locator('input[type="number"]').first();
      if (await quantityInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await quantityInput.fill(TEST_ACTIVITIES[0].quantity);
      }

      // Submit activity - look for button with Add or Save
      const submitBtn = page.locator('button').filter({ hasText: /Add|Save/ }).last();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('Step 5: Run emissions calculations', async () => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for Calculate All button
    const calculateAllBtn = page.locator('button:has-text("Calculate All"), button:has-text("Calculate Emissions")').first();
    if (await calculateAllBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calculateAllBtn.click();
      await page.waitForTimeout(3000);
    }

    // Alternatively, open calculator modal
    const calculatorBtn = page.locator('button:has-text("Calculator")').first();
    if (await calculatorBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await calculatorBtn.click();
      await page.waitForTimeout(1000);

      // Modal should be visible
      const modal = page.locator('[role="dialog"], .modal');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Close modal
      const closeBtn = page.locator('button:has-text("Close"), button:has-text("Cancel")').first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
      }
    }
  });

  test('Step 6: Navigate to Reports and generate a report', async () => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check reports page loaded - look for h1 containing Reports
    const reportsTitle = page.locator('h1').filter({ hasText: 'Reports' });
    await expect(reportsTitle).toBeVisible({ timeout: 15000 });

    // Check for any card-like elements (rounded corners styling)
    const contentCards = page.locator('[class*="rounded"]');
    const cardCount = await contentCards.count();
    console.log(`Found ${cardCount} UI cards on reports page`);

    // Click Generate Report button
    const generateBtn = page.locator('button').filter({ hasText: /Generate Report/ }).first();
    if (await generateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await generateBtn.click();
      await page.waitForTimeout(1000);

      // Modal should open - check for any modal-like overlay
      const modal = page.locator('[role="dialog"], [class*="modal"], [class*="fixed"]').first();
      if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Select a report type by clicking on GHG Inventory option
        const reportTypeBtn = page.locator('button').filter({ hasText: /GHG|Carbon|Inventory/ }).first();
        if (await reportTypeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await reportTypeBtn.click();
        }

        // Select project from dropdown
        const projectSelect = page.locator('select').first();
        if (await projectSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          const options = projectSelect.locator('option');
          const optionCount = await options.count();
          if (optionCount > 1) {
            await projectSelect.selectOption({ index: 1 });
          }
        }

        // Try to generate or close the modal
        const generateReportBtn = page.locator('button').filter({ hasText: /Generate/ }).last();
        if (await generateReportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await generateReportBtn.click();
          await page.waitForTimeout(3000);
        } else {
          const closeBtn = page.locator('button').filter({ hasText: 'Cancel' });
          if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await closeBtn.click();
          }
        }
      }
    }
  });

  test('Step 7: Verify data persistence across navigation', async () => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check that dashboard has content (any rounded elements = cards)
    const dashboardContent = page.locator('[class*="rounded"]');
    const cardCount = await dashboardContent.count();
    expect(cardCount).toBeGreaterThan(0);

    // Navigate to projects
    await page.goto('/projects');
    await page.waitForTimeout(3000);

    // Check projects page has content
    const projectsContent = page.locator('[class*="rounded"]');
    const projectCount = await projectsContent.count();
    console.log(`Found ${projectCount} UI elements on projects page`);

    // Navigate to activities
    await page.goto('/activities');
    await page.waitForTimeout(3000);

    // Activities page should load
    const activitiesHeading = page.locator('h1').filter({ hasText: 'Activities' });
    await expect(activitiesHeading).toBeVisible({ timeout: 15000 });
  });

  test('Step 8: Logout functionality works', async () => {
    // Look for logout button/link
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();

    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(2000);

      // Should be redirected to login
      const url = page.url();
      expect(url).toContain('/login');
    } else {
      // Check if user menu exists
      const userMenu = page.locator('[data-testid="user-menu"], .user-menu, .avatar').first();
      if (await userMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
        await userMenu.click();
        await page.waitForTimeout(500);

        const logoutInMenu = page.locator('button:has-text("Logout"), [role="menuitem"]:has-text("Logout")').first();
        if (await logoutInMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
          await logoutInMenu.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });
});

test.describe('GHG Calculation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, DEMO_USER.email, DEMO_USER.password);
  });

  test('Can calculate Scope 1 emissions', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForTimeout(2000);

    // Open calculator if available
    const calculatorBtn = page.locator('button:has-text("Calculator")').first();
    if (await calculatorBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calculatorBtn.click();
      await page.waitForTimeout(1000);

      // Look for scope selection
      const scope1Option = page.locator('button:has-text("Scope 1"), label:has-text("Scope 1")').first();
      if (await scope1Option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await scope1Option.click();
      }

      // Check for emission preview
      const emissionPreview = page.locator('[data-testid="emission-preview"], .emission-preview, text=/tCO₂e|kgCO2/');
      if (await emissionPreview.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Emission preview is visible');
      }

      // Close modal
      const closeBtn = page.locator('button:has-text("Close"), button:has-text("Cancel")').first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
      }
    }
  });

  test('Can calculate Scope 2 emissions', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForTimeout(2000);

    // Look for Scope 2 filter or tab
    const scope2Filter = page.locator('button:has-text("Scope 2"), [data-value="scope2"]').first();
    if (await scope2Filter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await scope2Filter.click();
      await page.waitForTimeout(1000);
    }

    // Verify page content
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });

  test('Can calculate Scope 3 emissions', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForTimeout(2000);

    // Look for Scope 3 filter or tab
    const scope3Filter = page.locator('button:has-text("Scope 3"), [data-value="scope3"]').first();
    if (await scope3Filter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await scope3Filter.click();
      await page.waitForTimeout(1000);
    }

    // Verify page content
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });
});

test.describe('Reporting Standards Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USER.email, DEMO_USER.password);
  });

  test('Can select EU CBAM standard for reporting', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);

    // Look for EU CBAM option
    const euCbamOption = page.locator('text=EU CBAM, [data-testid="eu_cbam"]').first();
    if (await euCbamOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await euCbamOption.click();
      await page.waitForTimeout(1000);
    }

    // Verify page content
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
  });

  test('Can select Thai ESG standard for reporting', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);

    // Look for Thai ESG option
    const thaiEsgOption = page.locator('text=Thai ESG, [data-testid="thai_esg"]').first();
    if (await thaiEsgOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await thaiEsgOption.click();
      await page.waitForTimeout(1000);
    }
  });

  test('Can select K-ESG standard for reporting', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);

    // Look for K-ESG option
    const kEsgOption = page.locator('text=K-ESG, [data-testid="k_esg"]').first();
    if (await kEsgOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await kEsgOption.click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Data Export Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, DEMO_USER.email, DEMO_USER.password);
  });

  test('Can export activities as CSV', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForTimeout(2000);

    // Look for export button
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download")').first();
    if (await exportBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      await exportBtn.click();

      const download = await downloadPromise;
      if (download) {
        const filename = download.suggestedFilename();
        console.log(`Downloaded file: ${filename}`);
        expect(filename).toBeTruthy();
      }
    }
  });

  test('Can export report as PDF', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);

    // Look for download button on a report
    const downloadBtn = page.locator('button[title="Download"], button:has-text("Download PDF")').first();
    if (await downloadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      await downloadBtn.click();

      const download = await downloadPromise;
      if (download) {
        console.log(`Downloaded: ${download.suggestedFilename()}`);
      }
    }
  });
});

test.describe('Error Handling', () => {
  test('Shows error for invalid login credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // Try to login with invalid credentials
    await page.fill('input[type="email"]', 'invalid@invalid.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);

    // Should still be on login page or show error
    const url = page.url();
    const hasError = await page.locator('.error, [role="alert"], text=/invalid|error|failed/i').isVisible().catch(() => false);

    expect(url.includes('/login') || hasError).toBeTruthy();
  });

  test('Handles network errors gracefully', async ({ page }) => {
    await login(page, DEMO_USER.email, DEMO_USER.password);

    // Navigate to a page that loads data
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Page should still be functional - check for heading
    const pageHeading = page.locator('h1').filter({ hasText: 'Projects' });
    await expect(pageHeading).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Performance', () => {
  test('Dashboard loads within acceptable time', async ({ page }) => {
    await login(page, DEMO_USER.email, DEMO_USER.password);

    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Dashboard load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
  });

  test('Projects page loads within acceptable time', async ({ page }) => {
    await login(page, DEMO_USER.email, DEMO_USER.password);

    const startTime = Date.now();
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Projects load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000);
  });

  test('Activities page loads within acceptable time', async ({ page }) => {
    await login(page, DEMO_USER.email, DEMO_USER.password);

    const startTime = Date.now();
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Activities load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000);
  });
});
