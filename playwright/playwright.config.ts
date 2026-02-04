import { defineConfig } from "@playwright/test";
import { defaultConfig, buildAppUrlFromEnv } from "testwright";
import { appConfig } from "./app.config.js";

/**
 * Example Playwright configuration
 *
 * Extends the default config from testwright and sets the baseURL
 * based on the app configuration and environment variables.
 *
 * Usage:
 *   TEST_DOMAIN=domain-alpha TEST_ENV=dev npx playwright test
 *   TEST_DOMAIN=domain-beta TEST_ENV=staging npx playwright test
 */
export default defineConfig({
  ...defaultConfig,
  testDir: "./tests",

  use: {
    ...defaultConfig.use,
    baseURL: buildAppUrlFromEnv(appConfig),
  },

  // Only run chromium for example tests
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],

  // Configure the TestCaseReporter for test case tracking
  reporter: [
    // Default HTML reporter
    ["html", { open: "never" }],
    // TestCase reporter for JSON output
    [
      "testwright/reporter",
      {
        outputFile: "./test-results/test-case-results.json",
        strictMode: false, // Set to true to fail if tests lack testCaseId
        allowDuplicates: true,
        testCaseIdPattern: "TC-\\d+",
      },
    ],
  ],
});
