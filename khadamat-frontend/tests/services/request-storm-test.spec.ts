import { test, expect } from '@playwright/test';

test.describe('Request Storm Prevention Tests @performance', () => {
  test('Rapid filter changes should be debounced with max 1 request per 300ms', async ({ page }) => {
    const requests: { url: string; timestamp: number }[] = [];

    // Monitor network requests
    page.on('request', (request) => {
      if (request.url().includes('/api/services')) {
        requests.push({
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });

    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // Wait for initial load
    await page.waitForTimeout(1000);

    // Clear previous requests
    requests.length = 0;

    const startTime = Date.now();

    // Rapidly change category filter 10 times
    for (let i = 0; i < 10; i++) {
      const select = page.locator('select').first(); // Category select
      await select.selectOption({ index: (i % 3) + 1 }); // Cycle through first 3 options
      await page.waitForTimeout(50); // Very short delay between changes
    }

    // Wait for debouncing to complete
    await page.waitForTimeout(1000);

    // Analyze requests
    const serviceRequests = requests.filter(req => req.timestamp >= startTime);

    // Should have at most 1 request per 300ms window
    let violations = 0;
    for (let i = 1; i < serviceRequests.length; i++) {
      const timeDiff = serviceRequests[i].timestamp - serviceRequests[i - 1].timestamp;
      if (timeDiff < 300) {
        violations++;
      }
    }

    console.log(`Total service requests: ${serviceRequests.length}`);
    console.log(`Debounce violations: ${violations}`);

    // Assert no violations
    expect(violations).toBe(0);
    expect(serviceRequests.length).toBeLessThanOrEqual(10); // Should be much less due to debouncing
  });

  test('Rapid search typing should be debounced', async ({ page }) => {
    const requests: { url: string; timestamp: number }[] = [];

    page.on('request', (request) => {
      if (request.url().includes('/api/services')) {
        requests.push({
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });

    await page.goto('/services');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    requests.length = 0;
    const startTime = Date.now();

    // Find search input
    const searchInput = page.locator('input[placeholder*="Rechercher"]').first();

    // Type rapidly
    await searchInput.click();
    await searchInput.fill('');
    await page.keyboard.type('plomberie', { delay: 10 }); // Very fast typing

    // Wait for debouncing
    await page.waitForTimeout(1000);

    const serviceRequests = requests.filter(req => req.timestamp >= startTime);

    // Should have minimal requests due to debouncing
    expect(serviceRequests.length).toBeLessThanOrEqual(2);
  });

  test('Multiple simultaneous filter changes should be debounced', async ({ page }) => {
    const requests: { url: string; timestamp: number }[] = [];

    page.on('request', (request) => {
      if (request.url().includes('/api/services')) {
        requests.push({
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });

    await page.goto('/services');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    requests.length = 0;
    const startTime = Date.now();

    // Change multiple filters simultaneously
    const categorySelect = page.locator('select').first();
    const citySelect = page.locator('select').nth(1);
    const searchInput = page.locator('input[placeholder*="Rechercher"]').first();

    await Promise.all([
      categorySelect.selectOption({ index: 1 }),
      citySelect.selectOption({ index: 1 }),
      searchInput.fill('test'),
    ]);

    await page.waitForTimeout(1000);

    const serviceRequests = requests.filter(req => req.timestamp >= startTime);

    // Should have at most 1 request due to debouncing
    expect(serviceRequests.length).toBeLessThanOrEqual(1);
  });

  test('No 429 status codes in network requests', async ({ page }) => {
    const failedRequests: { url: string; status: number }[] = [];

    page.on('response', (response) => {
      if (response.url().includes('/api/') && response.status() === 429) {
        failedRequests.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // Perform rapid filter changes
    for (let i = 0; i < 5; i++) {
      const select = page.locator('select').first();
      await select.selectOption({ index: (i % 3) + 1 });
      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(2000);

    expect(failedRequests.length).toBe(0);
  });

  test('Console should not contain AxiosError 429 or ThrottlerException', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('AxiosError') && text.includes('429') ||
            text.includes('ThrottlerException')) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // Perform rapid actions
    for (let i = 0; i < 5; i++) {
      const select = page.locator('select').first();
      await select.selectOption({ index: (i % 3) + 1 });
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(2000);

    expect(consoleErrors.length).toBe(0);
  });
});