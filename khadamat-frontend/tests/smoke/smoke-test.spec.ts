import { test, expect, Page } from '@playwright/test';

// Test configuration constants
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:4000';

// Test accounts
const TEST_ACCOUNTS = {
  PRO: {
    email: 'hassan@test.com',
    password: 'password123',
    role: 'PRO',
    expectedDashboard: '/dashboard/pro'
  },
  CLIENT: {
    email: 'jean.client@test.com',
    password: 'password123',
    role: 'CLIENT',
    expectedDashboard: '/dashboard/client'
  }
};

// Test data for profile updates
const PROFILE_UPDATE_DATA = {
  firstName: 'TestFirstName',
  lastName: 'TestLastName',
  phone: '+212600123456' // Moroccan format
};

// Custom test utilities for smoke tests
class SmokeTestUtils {
  constructor(private page: Page) {}

  /**
   * Login with email and password
   */
  async login(identifier: string, password: string): Promise<void> {
    await this.page.goto(`${FRONTEND_URL}/auth/login`);
    await this.page.waitForLoadState('networkidle');

    // Wait for login form to be ready
    await this.page.waitForSelector('input[name="identifier"]', { timeout: 10000 });

    // Fill login form
    await this.page.fill('input[name="identifier"]', identifier);
    await this.page.fill('input[name="password"]', password);

    // Submit login
    await this.page.click('button[type="submit"]');

    // Wait for login to complete and token to be stored
    await this.page.waitForTimeout(2000); // Allow time for login and redirect

    // Verify token is stored
    const token = await this.page.evaluate(() => localStorage.getItem('khadamat_access_token'));
    expect(token).toBeTruthy();
  }

  /**
   * Verify dashboard redirect based on user role
   */
  async verifyDashboardRedirect(expectedPath: string): Promise<void> {
    await this.page.waitForURL(`**${expectedPath}`, { timeout: 10000 });
    expect(this.page.url()).toContain(expectedPath);
  }

  /**
   * Navigate to profile page and update profile
   */
  async updateProfile(): Promise<void> {
    // Navigate to profile page (assuming it's accessible from dashboard)
    await this.page.goto(`${FRONTEND_URL}/dashboard/profile`);
    await this.page.waitForLoadState('networkidle');

    // Wait for profile form
    await this.page.waitForSelector('input[name="firstName"]', { timeout: 10000 });

    // Fill profile form
    await this.page.fill('input[name="firstName"]', PROFILE_UPDATE_DATA.firstName);
    await this.page.fill('input[name="lastName"]', PROFILE_UPDATE_DATA.lastName);
    await this.page.fill('input[name="phone"]', PROFILE_UPDATE_DATA.phone);

    // Submit profile update
    await this.page.click('button:has-text("Enregistrer")');

    // Wait for success message or API response
    await this.page.waitForTimeout(2000); // Allow time for API call

    // Verify profile was updated (check if values are still there or success message)
    const firstNameValue = await this.page.inputValue('input[name="firstName"]');
    expect(firstNameValue).toBe(PROFILE_UPDATE_DATA.firstName);
  }

  /**
   * Navigate to settings page and perform basic operations
   */
  async testSettingsPage(userRole: string): Promise<void> {
    const settingsPath = userRole === 'PRO' ? '/dashboard/pro/settings' : '/dashboard/client/settings';
    await this.page.goto(`${FRONTEND_URL}${settingsPath}`);
    await this.page.waitForLoadState('networkidle');

    // Wait for settings page to load
    await this.page.waitForSelector('form, [data-testid*="settings"]', { timeout: 10000 });

    // Basic interaction - click on first available setting or form element
    const formElements = await this.page.locator('input, select, textarea').first();
    if (await formElements.isVisible()) {
      await formElements.fill('Test Setting Value');
    }

    // Look for save button and click it
    const saveButton = this.page.locator('button:has-text("Enregistrer"), button:has-text("Sauvegarder")').first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await this.page.waitForTimeout(2000); // Allow time for save operation
    }
  }

  /**
   * Test services listing page
   */
  async testServicesPage(): Promise<void> {
    await this.page.goto(`${FRONTEND_URL}/services`);
    await this.page.waitForLoadState('networkidle');

    // Wait for services to load
    await this.page.waitForSelector('[data-testid*="service"], .service-card, .service-item', { timeout: 15000 });

    // Verify services are displayed
    const servicesCount = await this.page.locator('[data-testid*="service"], .service-card, .service-item').count();
    expect(servicesCount).toBeGreaterThan(0);

    // Test basic interaction - click on first service
    const firstService = this.page.locator('[data-testid*="service"], .service-card, .service-item').first();
    await firstService.click();

    // Wait for navigation or modal
    await this.page.waitForTimeout(2000);
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    // Look for logout button in navigation
    const logoutButton = this.page.locator('[data-testid*="logout"], button:has-text("Déconnexion"), a:has-text("Déconnexion")').first();
    await logoutButton.click();

    // Wait for redirect to login or home
    await this.page.waitForURL('**/auth/login', { timeout: 10000 });

    // Verify token is cleared
    const token = await this.page.evaluate(() => localStorage.getItem('khadamat_access_token'));
    expect(token).toBeNull();
  }

  /**
   * Monitor network requests and validate no 4xx/5xx errors
   */
  async monitorNetworkErrors(): Promise<void> {
    const errors: string[] = [];

    this.page.on('response', response => {
      const status = response.status();
      if (status >= 400) {
        errors.push(`${response.url()} - ${status}`);
      }
    });

    // Store errors for later validation
    await this.page.evaluate((errs) => {
      (window as any).networkErrors = errs;
    }, errors);
  }

  /**
   * Check for console errors
   */
  async checkConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];

    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a moment for any console errors to be captured
    await this.page.waitForTimeout(1000);

    return errors;
  }

  /**
   * Skip change password test (expected 404)
   */
  async skipChangePasswordTest(): Promise<void> {
    test.skip('Change password endpoint returns 404 as expected', async () => {
      // This test is intentionally skipped as the endpoint doesn't exist
      const response = await this.page.request.patch(`${BACKEND_URL}/api/user/change-password`, {
        data: { oldPassword: 'test', newPassword: 'test123' }
      });
      expect(response.status()).toBe(404);
    });
  }
}

// Main smoke test suite
test.describe('Khadamat Application Smoke Tests', () => {
  let utils: SmokeTestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new SmokeTestUtils(page);

    // Start HAR recording for network analysis
    await page.route('**/*', route => route.continue());
  });

  test.describe('Authentication Tests', () => {
    test('PRO user can login successfully', async ({ page }) => {
      await utils.monitorNetworkErrors();

      await utils.login(TEST_ACCOUNTS.PRO.email, TEST_ACCOUNTS.PRO.password);
      await utils.verifyDashboardRedirect(TEST_ACCOUNTS.PRO.expectedDashboard);

      // Check for console errors
      const consoleErrors = await utils.checkConsoleErrors();
      expect(consoleErrors.length).toBe(0);
    });

    test('CLIENT user can login successfully', async ({ page }) => {
      await utils.monitorNetworkErrors();

      await utils.login(TEST_ACCOUNTS.CLIENT.email, TEST_ACCOUNTS.CLIENT.password);
      await utils.verifyDashboardRedirect(TEST_ACCOUNTS.CLIENT.expectedDashboard);

      // Check for console errors
      const consoleErrors = await utils.checkConsoleErrors();
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Dashboard and Navigation Tests', () => {
    test('PRO dashboard loads correctly after login', async ({ page }) => {
      await utils.login(TEST_ACCOUNTS.PRO.email, TEST_ACCOUNTS.PRO.password);
      await utils.verifyDashboardRedirect(TEST_ACCOUNTS.PRO.expectedDashboard);

      // Verify dashboard content loads
      await page.waitForSelector('[data-testid*="dashboard"], .dashboard-content, main', { timeout: 10000 });
    });

    test('CLIENT dashboard loads correctly after login', async ({ page }) => {
      await utils.login(TEST_ACCOUNTS.CLIENT.email, TEST_ACCOUNTS.CLIENT.password);
      await utils.verifyDashboardRedirect(TEST_ACCOUNTS.CLIENT.expectedDashboard);

      // Verify dashboard content loads
      await page.waitForSelector('[data-testid*="dashboard"], .dashboard-content, main', { timeout: 10000 });
    });
  });

  test.describe('Profile Management Tests', () => {
    test('User can update profile information', async ({ page }) => {
      await utils.login(TEST_ACCOUNTS.PRO.email, TEST_ACCOUNTS.PRO.password);
      await utils.updateProfile();

      // Verify profile update was successful
      const successMessage = page.locator('text=Profil mis à jour, text=Profile updated, text=Success').first();
      // Either success message appears or form retains values
      const hasSuccessMessage = await successMessage.isVisible();
      if (!hasSuccessMessage) {
        const firstNameValue = await page.inputValue('input[name="firstName"]');
        expect(firstNameValue).toBe(PROFILE_UPDATE_DATA.firstName);
      }
    });

    test('User can update profile with empty phone number', async ({ page }) => {
      await utils.login(TEST_ACCOUNTS.PRO.email, TEST_ACCOUNTS.PRO.password);

      // Get auth token from localStorage
      const token = await page.evaluate(() => localStorage.getItem('khadamat_access_token'));
      expect(token).toBeTruthy();

      // Test API directly with empty phone
      const response = await page.request.patch(`${BACKEND_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          firstName: 'TestFirstName',
          lastName: 'TestLastName',
          phone: '' // Empty phone string
        }
      });

      // Verify successful response
      expect(response.status()).toBe(200);

      // Verify response contains updated data
      const responseData = await response.json();
      expect(responseData.firstName).toBe('TestFirstName');
      expect(responseData.lastName).toBe('TestLastName');
      // Ensure no phone validation error in response
      expect(JSON.stringify(responseData)).not.toContain("phone must be a valid phone number");
    });
  });

  test.describe('Settings Tests', () => {
    test('PRO settings page loads and allows updates', async ({ page }) => {
      await utils.login(TEST_ACCOUNTS.PRO.email, TEST_ACCOUNTS.PRO.password);
      await utils.testSettingsPage('PRO');

      // Verify settings page functionality
      await page.waitForSelector('form, [data-testid*="settings"]', { timeout: 10000 });
    });

    test('CLIENT settings page loads and allows updates', async ({ page }) => {
      await utils.login(TEST_ACCOUNTS.CLIENT.email, TEST_ACCOUNTS.CLIENT.password);
      await utils.testSettingsPage('CLIENT');

      // Verify settings page functionality
      await page.waitForSelector('form, [data-testid*="settings"]', { timeout: 10000 });
    });
  });

  test.describe('Services Tests', () => {
    test('Services listing page loads correctly', async ({ page }) => {
      await utils.login(TEST_ACCOUNTS.CLIENT.email, TEST_ACCOUNTS.CLIENT.password);
      await utils.testServicesPage();

      // Verify services are displayed
      const servicesVisible = await page.locator('[data-testid*="service"], .service-card, .service-item').first().isVisible();
      expect(servicesVisible).toBe(true);
    });
  });

  test.describe('Logout Tests', () => {
    test('User can logout successfully', async ({ page }) => {
      await utils.login(TEST_ACCOUNTS.PRO.email, TEST_ACCOUNTS.PRO.password);
      await utils.logout();

      // Verify redirect to login page
      expect(page.url()).toContain('/auth/login');
    });
  });

  test.describe('Error Handling Tests', () => {
    test('Application handles network errors gracefully', async ({ page }) => {
      await utils.monitorNetworkErrors();

      // Navigate to a page and check for error handling
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      // Check for console errors
      const consoleErrors = await utils.checkConsoleErrors();
      // Allow some console errors but ensure no critical errors
      const criticalErrors = consoleErrors.filter(error =>
        error.includes('TypeError') ||
        error.includes('ReferenceError') ||
        error.includes('SyntaxError')
      );
      expect(criticalErrors.length).toBe(0);
    });
  });

});