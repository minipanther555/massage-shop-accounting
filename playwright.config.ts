import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    storageState: 'tests/.auth/storageState.json',
    headless: false, // Set to true for CI
  },
  globalSetup: './tests/global-setup.ts',
  testDir: './tests',
  projects: [
    {
      name: 'integration',
      testMatch: '**/integration/**/*.spec.js',
    },
  ],
});
