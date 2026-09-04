import { defineConfig, devices } from '@playwright/test'

// LOCAL ONLY -- deliberately not wired into .github/workflows/ci.yml.
//
// This suite drives a real browser against a real Supabase project, so in CI it would
// need service-role and Anthropic secrets, spend API credit per run, collide with the
// public demo's reset-on-sign-in behaviour, and go red whenever the free-tier database
// pauses. A red badge reads as broken code, so CI runs only the hermetic unit suite.
//
// Run with: npm run e2e   (add --headed or --ui to watch it)

export default defineConfig({
  testDir: './tests/e2e',
  // Sequential: the suite shares one fixed test account, so parallel workers would
  // fight over the same restaurant.
  fullyParallel: false,
  workers: 1,
  // Never retry locally -- a flake should be visible, not smoothed over.
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],

  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Pinned so the timezone-dependent UI (dashboard greeting, default list date) and
    // the app chrome are deterministic regardless of the developer's machine.
    timezoneId: 'America/New_York',
    locale: 'en-US',
  },

  projects: [
    {
      name: 'mobile-chrome',
      // Mobile-first product, so the smoke test runs at phone size by default.
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
