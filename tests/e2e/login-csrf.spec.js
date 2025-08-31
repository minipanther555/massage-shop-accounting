const { test, expect } = require('@playwright/test');

/**
 * @fileoverview E2E test for the login flow to verify the CSRF fix.
 *
 * This test ensures that a real browser client can:
 * 1. Load the login page.
 * 2. Automatically fetch a CSRF token via the /csrf endpoint.
 * 3. Submit login credentials with the correct X-CSRF-Token header.
 * 4. Successfully authenticate without a 403 Forbidden error.
 * 5. Be redirected to the main application page.
 */

test.describe('Login CSRF Flow', () => {
  const LOGIN_URL = 'http://localhost:3000/login.html';
  const APP_URL = 'http://localhost:3000/index.html'; // CORRECTED: The app redirects to index.html

  test('should log in successfully and be redirected', async ({ page }) => {
    let csrfRequestFailed = false;
    let loginRequestFailed = false;

    // Listen for console errors specifically related to our API calls
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[API_CLIENT] CSRF token fetch failed')) {
        csrfRequestFailed = true;
      }
      if (text.includes('[API_CLIENT]') && text.includes('Request failed for POST /api/auth/login')) {
        loginRequestFailed = true;
      }
    });

    // 1. Navigate to the login page
    await page.goto(LOGIN_URL);

    // 2. Fill in the credentials
    await page.selectOption('#username', { value: 'manager' });
    await page.fill('#password', 'manager456');

    // 3. Click the login button and wait for navigation
    // This implicitly tests that the client-side JS fetches the CSRF token correctly.
    await Promise.all([
      page.waitForURL(APP_URL, { timeout: 5000 }), // Wait for the redirect to the main app
      page.click('#login-btn'),
    ]);

    // 4. Assertions
    // The primary assertion is that the navigation succeeded.
    await expect(page).toHaveURL(APP_URL);
    
    // Also, check that no critical API errors were logged to the console
    expect(csrfRequestFailed, 'CSRF token fetch should not fail').toBe(false);
    expect(loginRequestFailed, 'Login POST request should not fail').toBe(false);

    // Final check: The main content of the app is visible
    const mainContent = page.locator('.container');
    await expect(mainContent).toBeVisible();
    console.log('✅ Login successful and redirected to the main application.');
  });
});
