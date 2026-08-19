import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    // Headless by default. There are 27 specs under the e2e glob and `retries: 1`
    // above, so a visible-by-default run opens ~54 real browser windows over the
    // operator's desktop — which is what it did. Set PW_HEADED=1 to watch a run.
    headless: process.env.PW_HEADED !== '1',
  },
  globalSetup: './tests/global-setup.ts',
  testDir: './tests',
  projects: [
    {
      name: 'integration',
      testMatch: '**/integration/**/*.spec.js',
    },
    {
      name: 'e2e',
      testMatch: '**/e2e/**/*.spec.js',
    },
  ],
});
