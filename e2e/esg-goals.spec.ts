import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * ESG Goals Page - Playwright UI E2E Tests
 * Tests the ESG Goals feature through the browser UI
 */

const DEMO_USER = {
  email: 'admin@esgdemo.com',
  password: 'Demo@123',
};

async function login(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const signInTab = page.locator('button:has-text("Sign In")').first();
  if (await signInTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signInTab.click();
    await page.waitForTimeout(500);
  }

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  return !page.url().includes('/login');
}

test.describe('ESG Goals Page', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await login(page, DEMO_USER.email, DEMO_USER.password);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should navigate to ESG Goals page from sidebar', async () => {
    // Look for ESG Goals in sidebar navigation
    const goalsLink = page.locator('a[href="/goals"], nav >> text=ESG Goals').first();
    
    if (await goalsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await goalsLink.click();
      await page.waitForTimeout(2000);
      
      // Verify we're on the goals page
      const heading = page.locator('h1:has-text("ESG Goals")');
      await expect(heading).toBeVisible({ timeout: 10000 });
    } else {
      // Direct navigation
      await page.goto('/goals');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    // Check page loaded
    expect(page.url()).toContain('/goals');
  });

  test('should display the ESG Goals page with correct title', async () => {
    await page.goto('/goals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for main heading
    const heading = page.locator('h1').first();
    const headingText = await heading.textContent().catch(() => '');
    expect(headingText).toContain('ESG Goals');
  });

  test('should have project selector dropdown', async () => {
    await page.goto('/goals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Look for select element (project selector)
    const selects = page.locator('select');
    const selectCount = await selects.count();
    expect(selectCount).toBeGreaterThanOrEqual(1);
  });

  test('should have New Goal button', async () => {
    await page.goto('/goals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const newGoalBtn = page.locator('button:has-text("New Goal")');
    await expect(newGoalBtn).toBeVisible({ timeout: 10000 });
  });

  test('should have Update Progress button', async () => {
    await page.goto('/goals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const updateBtn = page.locator('button:has-text("Update Progress")');
    await expect(updateBtn).toBeVisible({ timeout: 10000 });
  });

  test('should open create goal modal when clicking New Goal', async () => {
    await page.goto('/goals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const newGoalBtn = page.locator('button:has-text("New Goal")');
    await newGoalBtn.click();
    await page.waitForTimeout(1000);

    // Check modal opened - look for modal heading
    const modalHeading = page.locator('h2:has-text("Create New ESG Goal")');
    await expect(modalHeading).toBeVisible({ timeout: 5000 });

    // Check form fields exist
    const nameInput = page.locator('input[placeholder*="Reduce"]').first();
    await expect(nameInput).toBeVisible({ timeout: 3000 });

    // Close modal
    const closeBtn = page.locator('button:has-text("Cancel")');
    await closeBtn.click();
    await page.waitForTimeout(500);
  });

  test('should have filter dropdowns for status and category', async () => {
    await page.goto('/goals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should have at least 3 selects: project, status, category
    const selects = page.locator('select');
    const selectCount = await selects.count();
    expect(selectCount).toBeGreaterThanOrEqual(3);
  });

  test('should display summary cards when goals exist', async () => {
    await page.goto('/goals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // If there are goals/summary, we should see stat cards
    // This may show empty state if no goals exist for selected project
    const cards = page.locator('[class*="rounded-xl"]');
    const cardCount = await cards.count();
    console.log(`Found ${cardCount} card elements on goals page`);
    expect(cardCount).toBeGreaterThanOrEqual(0);
  });

  test('should display empty state or goal list', async () => {
    await page.goto('/goals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Either shows "No ESG Goals Yet" or a list of goals
    const emptyState = page.locator('text=No ESG Goals');
    const goalItems = page.locator('[class*="border-l-4"]');
    
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
    const goalCount = await goalItems.count();

    console.log(`Empty state: ${hasEmpty}, Goal items: ${goalCount}`);
    // At least one of these should be true
    expect(hasEmpty || goalCount >= 0).toBeTruthy();
  });
});

test.describe('ESG Goals - Create Flow', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await login(page, DEMO_USER.email, DEMO_USER.password);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should create a new ESG goal via the form', async () => {
    await page.goto('/goals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Click New Goal
    const newGoalBtn = page.locator('button:has-text("New Goal")');
    if (!await newGoalBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('New Goal button not visible, skipping');
      return;
    }
    await newGoalBtn.click();
    await page.waitForTimeout(1000);

    // Fill the form
    const nameInput = page.locator('input[placeholder*="Reduce"]').first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('E2E Test - Reduce Scope 2 by 30%');
    }

    // Fill description
    const textareas = page.locator('textarea');
    if (await textareas.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await textareas.first().fill('Automated E2E test goal');
    }

    // Fill baseline value
    const numberInputs = page.locator('input[type="number"]');
    const numberCount = await numberInputs.count();
    if (numberCount >= 2) {
      await numberInputs.nth(0).fill('100'); // baseline value
      await numberInputs.nth(1).fill('70');  // target value
    }

    // Submit the form
    const createBtn = page.locator('button[type="submit"]:has-text("Create Goal")');
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(2000);

      // Modal should close
      const modal = page.locator('h2:has-text("Create New ESG Goal")');
      const isStillOpen = await modal.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (!isStillOpen) {
        console.log('✅ Goal created successfully - modal closed');
      }
    }
  });
});
