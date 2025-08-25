const LoginPage = require('../page-objects/LoginPage');

/**
 * Reusable authentication helper for E2E tests
 * Provides consistent login functionality across all test scenarios
 */
class AuthHelper {
  constructor(page) {
    this.page = page;
    this.loginPage = new LoginPage(page);
  }

  /**
   * Login as a specific user role
   * @param {string} role - The user role ('manager', 'reception')
   * @returns {Promise<void>}
   */
  async loginAs(role) {
    const credentials = this.getCredentialsForRole(role);
    
    await this.loginPage.navigate();
    await this.loginPage.login(credentials.username, credentials.password);
    
    // Verify successful login
    const isLoggedIn = await this.loginPage.isLoggedIn();
    if (!isLoggedIn) {
      throw new Error(`Failed to login as ${role}`);
    }
  }

  /**
   * Get credentials for a specific user role
   * @param {string} role - The user role
   * @returns {Object} Object containing username and password
   */
  getCredentialsForRole(role) {
    const credentials = {
      manager: {
        username: 'manager',
        password: 'manager456'
      },
      reception: {
        username: 'reception',
        password: 'reception123'
      }
    };

    if (!credentials[role]) {
      throw new Error(`Unknown role: ${role}. Available roles: ${Object.keys(credentials).join(', ')}`);
    }

    return credentials[role];
  }

  /**
   * Check if user is currently logged in
   * @returns {Promise<boolean>}
   */
  async isLoggedIn() {
    return await this.loginPage.isLoggedIn();
  }
}

module.exports = AuthHelper;
