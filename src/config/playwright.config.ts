import { defineConfig, devices } from "@playwright/test";
import type { PlaywrightTestConfig } from "@playwright/test";

/**
 * Default Playwright configuration with sensible defaults for multi-domain SPA testing.
 *
 * QA projects can override any settings in their own playwright.config.ts:
 *
 * @example
 * ```typescript
 * import { defineConfig } from '@playwright/test';
 * import { defaultConfig } from 'testwright/config';
 *
 * export default defineConfig({
 *   ...defaultConfig,
 *   testDir: './tests',
 *   workers: 4,
 * });
 * ```
 */
export const defaultConfig: PlaywrightTestConfig = defineConfig({
  // Test directory - consumers should override this
  testDir: "./tests",

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env["CI"],

  // Retry on CI only
  retries: process.env["CI"] ? 2 : 0,

  // Limit parallel workers on CI to avoid resource issues
  // When not in CI, Playwright uses its default (half of CPU cores)
  ...(process.env["CI"] ? { workers: 1 } : {}),

  // Reporter configuration
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL is set per-project using buildAppUrl
    // baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Capture screenshot on failure
    screenshot: "only-on-failure",

    // Record video on failure
    video: "on-first-retry",

    // Default timeout for actions
    actionTimeout: 10_000,

    // Default timeout for navigation
    navigationTimeout: 30_000,
  },

  // Global timeout for each test
  timeout: 60_000,

  // Expect timeout
  expect: {
    timeout: 10_000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // Mobile viewports
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  // Output directory for test artifacts
  outputDir: "test-results",
});

/**
 * Minimal configuration for quick local development.
 * Only runs Chromium with minimal retries/tracing.
 */
export const devConfig: PlaywrightTestConfig = defineConfig({
  ...defaultConfig,
  retries: 0,
  use: {
    ...defaultConfig.use,
    trace: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
