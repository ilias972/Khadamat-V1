# Khadamat Smoke Test Suite

## Overview

The Khadamat smoke test suite is a comprehensive set of end-to-end tests designed to validate the core functionality of the Khadamat application. These tests use Playwright to simulate real user interactions and ensure that critical user journeys work correctly after deployments or major changes.

The suite focuses on smoke testing - verifying that the application starts up properly and basic functionality works, rather than exhaustive testing of all features. Tests are organized into logical groups covering authentication, navigation, profile management, settings, services, logout, and error handling.

## Prerequisites

Before running the smoke tests, ensure the following are set up:

### Required Services
- **Frontend Application**: Running on `http://localhost:3000`
- **Backend API**: Running on `http://localhost:4000`
- **Database**: Properly configured and seeded with test data
- **Redis**: Available for caching and session management

### Test Accounts
The tests use predefined test accounts that must exist in the database:

- **PRO Account**:
  - Email: `hassan@test.com`
  - Password: `password123`
  - Expected dashboard: `/dashboard/pro`

- **CLIENT Account**:
  - Email: `jean.client@test.com`
  - Password: `password123`
  - Expected dashboard: `/dashboard/client`

### Environment Setup
1. Ensure all dependencies are installed:
   ```bash
   cd khadamat-frontend
   npm install
   ```

2. Start the backend server:
   ```bash
   npm run start:dev
   ```

3. Start the frontend development server:
   ```bash
   cd khadamat-frontend
   npm run dev
   ```

4. Verify both servers are accessible at their respective URLs.

## Running the Tests

### Basic Execution
To run all smoke tests:
```bash
cd khadamat-frontend
npx playwright test tests/smoke/smoke-test.spec.ts
```

### With Specific Options
```bash
# Run with headed browser (visible)
npx playwright test tests/smoke/smoke-test.spec.ts --headed

# Run specific test group
npx playwright test tests/smoke/smoke-test.spec.ts --grep "Authentication"

# Run with debugging
npx playwright test tests/smoke/smoke-test.spec.ts --debug

# Generate HTML report
npx playwright test tests/smoke/smoke-test.spec.ts --reporter=html
```

### CI/CD Integration
For automated testing in CI/CD pipelines:
```bash
# Run headless with JSON output
npx playwright test tests/smoke/smoke-test.spec.ts --reporter=json
```

## Test Coverage

The smoke test suite validates the following critical user journeys:

### Authentication Tests
- **PRO Login**: Validates successful login for professional users and correct dashboard redirection
- **CLIENT Login**: Validates successful login for client users and correct dashboard redirection
- Both tests verify JWT token storage and absence of console errors

### Dashboard and Navigation Tests
- **PRO Dashboard**: Ensures professional dashboard loads correctly after login
- **CLIENT Dashboard**: Ensures client dashboard loads correctly after login
- Tests verify dashboard content rendering and basic page structure

### Profile Management Tests
- **Profile Update**: Tests the ability to update user profile information (first name, last name, phone)
- Validates form submission and data persistence
- Checks for success messages or form value retention

### Settings Tests
- **PRO Settings**: Validates settings page loads and allows basic updates
- **CLIENT Settings**: Validates settings page loads and allows basic updates
- Tests basic form interactions and save operations

### Services Tests
- **Services Listing**: Validates services page loads and displays available services
- Tests service card interactions and navigation
- Ensures service data is properly rendered

### Logout Tests
- **User Logout**: Validates successful logout functionality
- Verifies token removal from localStorage
- Confirms redirection to login page

### Error Handling Tests
- **Network Error Monitoring**: Monitors for 4xx/5xx HTTP responses during test execution
- **Console Error Checking**: Captures and validates absence of critical JavaScript errors
- Ensures graceful error handling in the application

## Outputs and Artifacts

The smoke tests generate several types of artifacts for debugging and reporting:

### HAR Files
- Network request/response captures for all test scenarios
- Useful for analyzing API calls and identifying network issues
- Location: `test-results/` directory

### Screenshots
- Automatic screenshots on test failures
- Captures the browser state when tests fail
- Location: `test-results/` directory

### Traces
- Playwright traces for detailed execution analysis
- Includes timeline, network, and DOM snapshots
- Location: `test-results/` directory

### JSON Reports
- Structured test results in JSON format
- Includes test status, duration, and error details
- Suitable for CI/CD integration and automated processing

### HTML Reports
- Interactive web-based test reports
- Visual representation of test results with screenshots
- Generated using `--reporter=html` flag

## Troubleshooting Common Issues

### Current Known Issues
- **UI/Component Failures**: Some tests may fail due to UI component issues. Login tests currently pass, but dashboard, profile, and settings tests may encounter component rendering problems.
- **Selector Timeouts**: Tests may timeout waiting for elements if the UI is slow to load or selectors have changed.

### Common Problems and Solutions

#### Test Account Issues
**Problem**: Login tests fail with authentication errors
**Solution**:
- Verify test accounts exist in the database
- Check account credentials match exactly
- Ensure accounts are not locked due to failed login attempts
- Reset account passwords if necessary

#### Server Connection Issues
**Problem**: Tests fail with connection refused errors
**Solution**:
- Verify frontend server is running on `localhost:3000`
- Verify backend server is running on `localhost:4000`
- Check for port conflicts
- Ensure CORS is properly configured

#### Element Selector Failures
**Problem**: Tests fail waiting for elements to appear
**Solution**:
- Check if UI components have been updated and selectors changed
- Verify the application is fully loaded before tests run
- Increase timeout values if needed: `await page.waitForSelector(selector, { timeout: 15000 })`
- Use more robust selectors or data-testid attributes

#### Network Error Monitoring
**Problem**: Tests report unexpected 4xx/5xx errors
**Solution**:
- Check backend API endpoints are responding correctly
- Verify authentication tokens are valid
- Review server logs for API errors
- Ensure all required services are running

#### Console Error Issues
**Problem**: Tests fail due to JavaScript console errors
**Solution**:
- Check browser console for error details
- Fix any JavaScript runtime errors
- Verify all dependencies are properly loaded
- Check for broken imports or missing assets

#### Profile/Settings Update Failures
**Problem**: Profile or settings update tests fail
**Solution**:
- Verify form field names match the test data
- Check if API endpoints for updates are working
- Ensure user has proper permissions for updates
- Validate form validation rules

### Debugging Tips
1. **Run tests in headed mode** to see what's happening visually:
   ```bash
   npx playwright test --headed
   ```

2. **Use Playwright's debugging tools**:
   ```bash
   npx playwright test --debug
   ```

3. **Check test artifacts** in the `test-results/` directory for screenshots and traces

4. **Review server logs** for backend errors during test execution

5. **Use browser developer tools** to inspect elements and network requests

## Maintenance and Updating Test Accounts

### Account Management
Test accounts should be maintained regularly to ensure they remain valid:

1. **Password Updates**: Update passwords in both the database and test script if changed
2. **Account Verification**: Regularly verify accounts are active and not locked
3. **Data Consistency**: Ensure test accounts have appropriate roles and permissions

### Test Data Updates
When updating test data:

1. Update the constants in `smoke-test.spec.ts`:
   ```typescript
   const TEST_ACCOUNTS = {
     PRO: {
       email: 'new-email@test.com',
       password: 'new-password',
       // ...
     }
   };
   ```

2. Update corresponding database records
3. Update this documentation

### Adding New Tests
When adding new smoke tests:

1. Follow the existing pattern using the `SmokeTestUtils` class
2. Add appropriate error monitoring and console error checking
3. Update this documentation with new test coverage
4. Ensure tests are reliable and not flaky

### Regular Maintenance Tasks
- **Weekly**: Run smoke tests and review results
- **Monthly**: Update test accounts and verify data integrity
- **After UI Changes**: Update selectors and verify test compatibility
- **After API Changes**: Verify endpoint compatibility and update test expectations

## Test Execution Best Practices

1. **Run smoke tests before deployments** to catch critical issues
2. **Monitor test execution time** - significant increases may indicate performance problems
3. **Review failure patterns** to identify systemic issues
4. **Keep test environment clean** between runs
5. **Document any skipped tests** and reasons for skipping

## Contact and Support

For issues with the smoke test suite:
- Check this documentation first
- Review recent commits for UI/component changes
- Contact the development team for assistance with test failures
- Create issues for test improvements or new test requirements