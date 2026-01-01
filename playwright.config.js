"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const baseURL = process.env.SITE_BASE_URL || 'http://localhost:3000';
exports.default = (0, test_1.defineConfig)({
    testDir: './tests',
    timeout: 120_000,
    expect: {
        timeout: 5_000,
    },
    retries: 1,
    reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
    outputDir: 'test-results/playwright-artifacts',
    use: {
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 15_000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...test_1.devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...test_1.devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...test_1.devices['Desktop Safari'] },
        },
    ],
    workers: process.env.CI ? 3 : 5,
});
//# sourceMappingURL=playwright.config.js.map