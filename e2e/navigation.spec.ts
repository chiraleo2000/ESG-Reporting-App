import { test, expect } from '@playwright/test';

const tabs = ['Home', 'Measure', 'Calculate', 'Report', 'Insights', 'Connect', 'Account'];

test.describe('main navigation', () => {
  test('logs in and opens every main tab', async ({ page }) => {
    await page.goto('/login');
    const signIn = page.getByRole('button', { name: /sign in|log in/i }).first();
    if (await signIn.isVisible().catch(() => false)) await signIn.click();
    await page.locator('input[type="email"]').fill('admin@esgdemo.com');
    await page.locator('input[type="password"]').first().fill('Demo@123');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible({ timeout: 15000 });

    for (const name of tabs) {
      await page.getByRole('tab', { name }).click();
      await expect(page.getByRole('tab', { name, selected: true })).toBeVisible();
    }

    await page.getByRole('tab', { name: 'Connect' }).click();
    await page.getByRole('button', { name: /Website or REST API/i }).click();
    await page.getByRole('button', { name: 'Test connection' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save connection' })).toBeDisabled();
  });

  test('tabs stay usable on a narrow screen and in dark mode', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    const signIn = page.getByRole('button', { name: /sign in|log in/i }).first();
    if (await signIn.isVisible().catch(() => false)) await signIn.click();
    await page.locator('input[type="email"]').fill('admin@esgdemo.com');
    await page.locator('input[type="password"]').first().fill('Demo@123');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /theme/i }).click();
    await page.getByRole('tab', { name: 'Home' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Measure', selected: true })).toBeVisible();
  });
});
