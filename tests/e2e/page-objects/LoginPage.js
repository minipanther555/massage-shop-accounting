class LoginPage {
  constructor(page) {
    this.page = page;
    
    // Stable selectors - these should be the most reliable way to identify elements
    this.selectors = {
      username: '#username',
      password: '#password',
      loginButton: '#login-btn',
      loginForm: '#login-form'
    };
  }

  async navigate() {
    await this.page.goto('/login.html');
  }

  async login(username, password) {
    await this.page.selectOption(this.selectors.username, username);
    await this.page.fill(this.selectors.password, password);
    await this.page.click(this.selectors.loginButton);
    
    // Wait for successful login by checking URL change
    await this.page.waitForURL('/index.html', { timeout: 10000 });
  }

  async isLoggedIn() {
    try {
      await this.page.waitForURL('/index.html', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = LoginPage;
