import { test, expect } from '@playwright/test';

test('Services -> Pros redirects with pre-applied category filter', async ({ page }) => {
  await page.goto('/services');

  const firstCta = page.locator('a[href*="categoryId="]').first();
  await expect(firstCta).toBeVisible();
  const href = await firstCta.getAttribute('href');
  expect(href).toBeTruthy();
  await firstCta.click();

  await page.waitForURL(/\/pros(\?|$)/);
  const url = page.url();
  expect(url).toMatch(/[?&]categoryId=/);

  const firstProLink = page.locator('a[href^="/pro/"]').first();
  await expect(firstProLink).toBeVisible();
});
