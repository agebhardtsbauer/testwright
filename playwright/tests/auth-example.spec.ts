import { test, expect } from "@playwright/test";
import {
  getTargetEnvironment,
  getTargetDomain,
  getUsersByType,
  getUserPassword,
  getSessionFilePath,
  isSessionValid,
  clearSession,
  clearSessionCache,
  loginToApp,
  fillLoginForm,
  submitLoginForm,
  testCase,
} from "testwright";
import { appConfig } from "../app.config.js";
import { testUsers } from "../testUsers.js";

/**
 * Example authentication tests using testwright helpers
 *
 * These demonstrate the authentication patterns provided by the module.
 * Note: Tests that interact with real login pages are skipped since
 * we don't have a real test server.
 */

test.describe("Authentication Helpers", () => {
  /**
   * These tests demonstrate the authentication helper functions.
   * They are skipped because they require a real application server.
   */

  test.skip("loginToApp performs full login flow", async ({ page }) => {
    // Get a member user for the current environment/domain
    const domain = getTargetDomain(appConfig);
    const environment = getTargetEnvironment();
    const members = getUsersByType(testUsers, "member", environment, domain);
    const user = members[0];

    if (!user) {
      test.skip(true, `No member user found for ${environment}/${domain}`);
      return;
    }

    // Use the loginToApp helper from testwright
    await loginToApp(page, appConfig, user);

    // Verify we're authenticated
    await expect(page.getByRole("button", { name: "Profile" })).toBeVisible();
  });

  test.skip("fillLoginForm fills email and password", async ({ page }) => {
    await page.goto("/login");

    const user = getUsersByType(testUsers, "member", "dev", "domain-alpha")[0];
    if (!user) return;

    // Use helper to fill form
    await fillLoginForm(page, user.email, getUserPassword(user));

    // Verify fields are filled
    await expect(page.locator('input[type="email"]')).toHaveValue(user.email);
  });

  test.skip("submitLoginForm submits and waits for navigation", async ({ page }) => {
    await page.goto("/login");

    const user = getUsersByType(testUsers, "member", "dev", "domain-alpha")[0];
    if (!user) return;

    await fillLoginForm(page, user.email, getUserPassword(user));
    await submitLoginForm(page);

    // Should have navigated away from login page
    await expect(page).not.toHaveURL(/login/);
  });
});

test.describe("Session Management", () => {
  test("getSessionFilePath generates correct path format", async () => {
    const user = getUsersByType(testUsers, "member", "dev", "domain-alpha")[0];

    if (user) {
      const sessionPath = getSessionFilePath(user.id, user.domain, user.environment);
      // Expected format: .auth/{userId}_{domain}_{environment}.json
      expect(sessionPath).toBe(`.auth/${user.id}_${user.domain}_${user.environment}.json`);
      expect(sessionPath).toBe(".auth/member-1-dev-alpha_domain-alpha_dev.json");
    }
  });

  test("isSessionValid returns false for non-existent session", async () => {
    // Check for a session that doesn't exist
    const isValid = await isSessionValid("nonexistent-user", "domain-alpha", "dev");
    expect(isValid).toBe(false);
  });

  test("clearSession handles non-existent session gracefully", async () => {
    // Should not throw when clearing non-existent session
    await expect(
      clearSession("nonexistent-user", "domain-alpha", "dev")
    ).resolves.not.toThrow();
  });

  test("clearSessionCache can be called safely", async () => {
    // Should not throw even with empty cache directory
    await expect(clearSessionCache()).resolves.not.toThrow();
  });
});

test.describe("User Selection Patterns", () => {
  test("find user by type for current environment", async () => {
    const domain = getTargetDomain(appConfig);
    const environment = getTargetEnvironment();

    const members = getUsersByType(testUsers, "member", environment, domain);
    expect(members.length).toBeGreaterThanOrEqual(0);

    if (members.length > 0) {
      expect(members[0]?.type).toBe("member");
      expect(members[0]?.environment).toBe(environment);
      expect(members[0]?.domain).toBe(domain);
    }
  });

  test("find practitioner for special tests", async () => {
    const practitioners = getUsersByType(
      testUsers,
      "practitioner",
      "dev",
      "domain-alpha"
    );

    expect(practitioners.length).toBeGreaterThan(0);
    expect(practitioners[0]?.tags).toContain("canPrescribe");
  });

  test("find admin for admin-only tests", async () => {
    const admins = getUsersByType(testUsers, "admin", "dev", "domain-alpha");

    expect(admins.length).toBeGreaterThan(0);
    expect(admins[0]?.tags).toContain("canManageUsers");
  });
});

/**
 * Test Case tracking examples for authentication scenarios
 */
test.describe("Authentication Test Cases", () => {
  testCase("TC-2001", "session path format is correct", async () => {
    const path = getSessionFilePath("test-user", "test-domain", "dev");
    expect(path).toMatch(/\.auth\/.*\.json$/);
  });

  testCase("TC-2002", "user password retrieval works", async () => {
    const user = getUsersByType(testUsers, "member", "dev", "domain-alpha")[0];
    if (user) {
      const password = getUserPassword(user);
      expect(typeof password).toBe("string");
    }
  });

  testCase(
    ["TC-2003", "TC-2004"],
    "environment helpers return valid values",
    async () => {
      // TC-2003: getTargetEnvironment returns valid environment
      const env = getTargetEnvironment();
      expect(["dev", "staging", "prod"]).toContain(env);

      // TC-2004: getTargetDomain returns string
      const domain = getTargetDomain(appConfig);
      expect(typeof domain).toBe("string");
      expect(domain.length).toBeGreaterThan(0);
    }
  );
});
