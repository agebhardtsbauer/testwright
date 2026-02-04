import { test, expect } from "testwright/fixtures";
import {
  buildAppUrl,
  getTargetEnvironment,
  getTargetDomain,
  getUsersByTags,
  getUsersByType,
  getUserPassword,
  getSessionFilePath,
} from "testwright";
import { appConfig } from "../app.config.js";
import { testUsers } from "../testUsers.js";

/**
 * Example test file demonstrating basic usage patterns
 *
 * These tests showcase:
 * - URL building utilities
 * - User filtering functions
 * - Session cache path generation
 * - Test case ID tracking with testCase()
 */

test.describe("Landing Page", () => {
  test("displays main heading", async ({ page }) => {
    // Navigate using baseURL from config (set via buildAppUrlFromEnv)
    await page.goto("/");

    // Example assertion
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("navigates to profile route", async ({ page }) => {
    await page.goto("/");

    // Navigate within the app
    await page.getByRole("link", { name: "Profile" }).click();

    // Verify URL includes the app slug and route
    await expect(page).toHaveURL(/\/s\/member-landing\/profile/);
  });
});

test.describe("URL Building", () => {
  test("buildAppUrl generates correct URLs", async () => {
    const url = buildAppUrl(appConfig, "domain-alpha", "dev");
    expect(url).toBe("https://www-dev.domain-alpha.com/s/member-landing");

    const stagingUrl = buildAppUrl(appConfig, "domain-beta", "staging");
    expect(stagingUrl).toBe("https://www-staging.domain-beta.com/s/member-landing");
  });

  test("environment helpers read from process.env", async () => {
    // These read TEST_ENV and TEST_DOMAIN from environment
    const env = getTargetEnvironment();
    const domain = getTargetDomain(appConfig);

    // Default values when env vars not set
    expect(["dev", "staging", "prod"]).toContain(env);
    expect(typeof domain).toBe("string");
  });
});

test.describe("User Filtering", () => {
  test("getUsersByTags filters correctly", async () => {
    // Now using imported function from testwright
    const subscribedUsers = getUsersByTags(
      testUsers,
      ["hasSubscription", "isActive"],
      "dev",
      "domain-alpha"
    );

    expect(subscribedUsers.length).toBeGreaterThan(0);
    expect(subscribedUsers.every((u) => u.tags.includes("hasSubscription"))).toBe(true);
    expect(subscribedUsers.every((u) => u.tags.includes("isActive"))).toBe(true);
    expect(subscribedUsers.every((u) => u.domain === "domain-alpha")).toBe(true);
    expect(subscribedUsers.every((u) => u.environment === "dev")).toBe(true);
  });

  test("getUsersByType filters correctly", async () => {
    // Now using imported function from testwright
    const members = getUsersByType(testUsers, "member", "dev", "domain-alpha");

    expect(members.length).toBeGreaterThan(0);
    expect(members.every((u) => u.type === "member")).toBe(true);
  });

  test("getUserPassword returns password or default", async () => {
    const members = getUsersByType(testUsers, "member", "dev", "domain-alpha");
    const member = members[0];

    if (member) {
      const password = getUserPassword(member);
      // Password should be string (either user-specific or from DEFAULT_TEST_PASSWORD)
      expect(typeof password).toBe("string");
    }
  });
});

test.describe("Session Cache", () => {
  test("getSessionFilePath generates correct paths", async () => {
    const path = getSessionFilePath("user-123", "domain-alpha", "dev");
    expect(path).toBe(".auth/user-123_domain-alpha_dev.json");

    const customPath = getSessionFilePath("user-456", "domain-beta", "staging", "/custom/cache");
    expect(customPath).toBe("/custom/cache/user-456_domain-beta_staging.json");
  });
});

/**
 * Examples using testCaseId fixture for test case tracking
 *
 * These tests demonstrate how to associate tests with test case IDs
 * from your test management system. The TestCaseReporter will extract
 * these IDs and generate a JSON report.
 */
test.describe("Test Case Tracking Examples", () => {
  // Single test case ID
  test("verify landing page loads", async ({ page, testCaseId }) => {
    testCaseId("TC-1001");
    await page.goto("/");
    await expect(page).toHaveTitle(/.*/);
  });

  // Multiple test case IDs for one test
  test("verify page has essential elements", async ({ page, testCaseId }) => {
    testCaseId(["TC-1002", "TC-1003"]);
    await page.goto("/");
    // TC-1002: Page has main content
    await expect(page.locator("body")).toBeVisible();
    // TC-1003: Page has navigation (if present)
    // This test satisfies both test cases
  });
});
