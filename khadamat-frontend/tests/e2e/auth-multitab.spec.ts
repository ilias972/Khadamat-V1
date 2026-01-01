import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'qa_client@example.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Password123!';

function makeCallTracker(page: Page) {
  const calls: { url: string; method: string }[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (
      url.includes('/auth/refresh') ||
      url.includes('/api/auth/refresh') ||
      url.includes('/user/profile') ||
      url.includes('/api/user/profile')
    ) {
      calls.push({ url, method: req.method() });
    }
  });
  return {
    reset: () => (calls.length = 0),
    count: (needle: string) => calls.filter((c) => c.url.includes(needle)).length,
    dump: () => calls.map((c) => `${c.method} ${c.url}`),
  };
}

async function openUserMenu(page: Page) {
  const avatarButton = page.locator('.user-dropdown-container button').first();
  if (await avatarButton.isVisible()) {
    await avatarButton.click();
  }
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/auth/login`);
  await page.getByTestId('auth-email').fill(EMAIL);
  await page.getByTestId('auth-password').fill(PASSWORD);
  await page.getByTestId('auth-submit').click();
  await openUserMenu(page);
  await expect(page.getByTestId('nav-logout')).toBeVisible();
}

async function logout(page: Page) {
  await openUserMenu(page);
  await page.getByTestId('nav-logout').click();
  await expect(page.getByTestId('nav-login')).toBeVisible();
}

test.describe('Auth multi-tab + refresh breaker', () => {
  test('T1 Logout sync: B becomes anonymous immediately, no refresh/profile on B', async ({ browser }) => {
    const context = await browser.newContext();
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await login(pageA);
    await pageB.goto(`${BASE_URL}/`);
    await openUserMenu(pageB);
    await expect(pageB.getByTestId('nav-logout')).toBeVisible();

    const trackerB = makeCallTracker(pageB);
    trackerB.reset();

    await logout(pageA);

    await expect(pageB.getByTestId('nav-login')).toBeVisible({ timeout: 2000 });
    await pageB.waitForTimeout(1500);
    expect(trackerB.count('/auth/refresh')).toBe(0);
    expect(trackerB.count('/user/profile')).toBe(0);

    await context.close();
  });

  test('T2 Login sync: B bootstraps exactly once (/user/profile once)', async ({ browser }) => {
    const context = await browser.newContext();
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await pageA.goto(`${BASE_URL}/`);
    await pageB.goto(`${BASE_URL}/`);

    const trackerB = makeCallTracker(pageB);
    trackerB.reset();

    await login(pageA);

    await openUserMenu(pageB);
    await expect(pageB.getByTestId('nav-logout')).toBeVisible({ timeout: 4000 });

    await pageB.waitForTimeout(1500);
    const profileCalls = trackerB.count('/user/profile');
    expect(profileCalls).toBe(1);

    await context.close();
  });

  test('T3 REFRESH_FAILED broadcast: force refresh 401 in A => B becomes anonymous, no storm', async ({ browser }) => {
    const context = await browser.newContext();
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await login(pageA);
    await pageB.goto(`${BASE_URL}/`);
    await openUserMenu(pageB);
    await expect(pageB.getByTestId('nav-logout')).toBeVisible();

    const trackerB = makeCallTracker(pageB);
    trackerB.reset();

    await pageA.route('**/*auth/refresh*', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized (forced)' }),
      });
    });

    await pageA.goto(`${BASE_URL}/dashboard`);
    await expect(pageA.getByTestId('nav-login')).toBeVisible({ timeout: 4000 });

    await expect(pageB.getByTestId('nav-login')).toBeVisible({ timeout: 2000 });
    await pageB.waitForTimeout(1500);
    expect(trackerB.count('/auth/refresh')).toBe(0);
    expect(trackerB.count('/user/profile')).toBe(0);

    await context.close();
  });

  test('T4 Breaker reset: after REFRESH_FAILED, login re-enables refresh path', async ({ browser }) => {
    const context = await browser.newContext();
    const pageA = await context.newPage();

    await login(pageA);
    await pageA.route('**/*auth/refresh*', async (route) => {
      await route.fulfill({ status: 401, body: 'Unauthorized (forced)' });
    });
    await pageA.goto(`${BASE_URL}/dashboard`);
    await expect(pageA.getByTestId('nav-login')).toBeVisible({ timeout: 4000 });

    await pageA.unroute('**/*auth/refresh*');
    await login(pageA);

    const trackerA = makeCallTracker(pageA);
    trackerA.reset();

    await pageA.goto(`${BASE_URL}/dashboard`);
    await expect(pageA.getByTestId('nav-logout')).toBeVisible();

    await pageA.waitForTimeout(1000);

    await context.close();
  });
});
