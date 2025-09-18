import { FullConfig } from '@playwright/test';

export default async function globalSetup(_: FullConfig) {
  // When PWTEST is on, we skip login entirely—server fakes a session.
  if (process.env.PWTEST === '1') {
    console.log('🧪 Global setup: PWTEST bypass enabled, skipping authentication');
    return;
  }
  
  // If you ever need real login in non-test env, keep your old flow here.
  console.log('🔐 Global setup: Real authentication not implemented for non-PWTEST mode');
}
