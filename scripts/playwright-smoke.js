/**
 * Simple Playwright smoke script.
 * - Navigates a list of routes.
 * - Logs console errors/warnings and 4xx/5xx responses.
 * - Exits with code 1 if any blocking error is detected.
 *
 * Usage:
 *   npm install (ensure @playwright/test is in devDependencies)
 *   npx playwright install chromium
 *   node scripts/playwright-smoke.js
 */

const { chromium } = require('playwright');

// Adjust baseURL if the frontend runs elsewhere
const BASE_URL = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

// Public routes to cover quickly (add/remove as needed)
const ROUTES = [
  '/',
  '/pros',
  '/services',
  '/devenir-pro',
  '/auth/login',
  '/auth/register',
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];

  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      errors.push({ type: 'console', level: msg.type(), text: msg.text() });
      console.log(`[console ${msg.type()}] ${msg.text()}`);
    }
  });

  page.on('response', (resp) => {
    const status = resp.status();
    if (status >= 400) {
      errors.push({
        type: 'response',
        status,
        url: resp.url(),
        statusText: resp.statusText(),
      });
      console.log(`[http ${status}] ${resp.url()}`);
    }
  });

  for (const path of ROUTES) {
    const url = `${BASE_URL}${path}`;
    console.log(`\nVisiting ${url}`);
    const res = await page.goto(url, { waitUntil: 'networkidle' });
    if (!res) {
      errors.push({ type: 'navigation', url, message: 'No response object returned' });
      continue;
    }
    console.log(`Status: ${res.status()} ${res.statusText()}`);

    // Basic sanity: wait a moment for hydration/errors to surface
    await page.waitForTimeout(1500);
  }

  await browser.close();

  if (errors.length) {
    console.log('\n=== Issues detected ===');
    errors.forEach((e) => console.log(JSON.stringify(e, null, 2)));
    process.exit(1);
  } else {
    console.log('\nNo blocking console/http errors detected on visited routes.');
  }
}

run().catch((err) => {
  console.error('Smoke script failed:', err);
  process.exit(1);
});