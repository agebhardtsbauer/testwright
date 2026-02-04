/**
 * Example demonstrating Playwright fixtures from testwright
 *
 * This file shows how to use the custom fixtures provided by the module
 * for authenticated testing, user-type specific pages, and dynamic user selection.
 *
 * Note: These tests require a real application server to run.
 * They are marked as skipped to demonstrate the API patterns.
 */

import { test as fixtureTest, expect } from "testwright/fixtures";
import { test, expect as baseExpect } from "@playwright/test";
import { testCase } from "testwright";
import { appConfig } from "../app.config.js";
import { testUsers } from "../testUsers.js";

/**
 * Configure fixtures for all tests in this file
 *
 * This sets up the appConfig and testUsers that the fixtures need
 * to authenticate users and navigate to the app.
 */
fixtureTest.use({
  appConfig,
  testUsers,
  defaultUserType: "member",
});

/**
 * Examples using authenticatedPage fixture
 *
 * The authenticatedPage fixture provides a page that's already
 * logged in with the default user type (member in this case).
 */
fixtureTest.describe("Authenticated Page Fixture", () => {
  fixtureTest.skip("authenticatedPage is logged in", async ({ authenticatedPage }) => {
    // The page should already be authenticated
    // This would navigate to the app and verify the user is logged in
    await authenticatedPage.goto("/");
    await expect(authenticatedPage.getByRole("button", { name: /profile/i })).toBeVisible();
  });

  fixtureTest.skip("can access protected routes", async ({ authenticatedPage }) => {
    // Navigate to a protected route
    await authenticatedPage.goto("/dashboard");
    await expect(authenticatedPage.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });
});

/**
 * Examples using user-type fixtures
 *
 * These fixtures provide pages authenticated as specific user types.
 */
fixtureTest.describe("User Type Fixtures", () => {
  fixtureTest.skip("memberPage is authenticated as member", async ({ memberPage }) => {
    await memberPage.goto("/profile");
    // Member-specific UI elements
    await expect(memberPage.getByText(/member/i)).toBeVisible();
  });

  fixtureTest.skip("practitionerPage has practitioner permissions", async ({ practitionerPage }) => {
    await practitionerPage.goto("/dashboard");
    // Practitioner-specific UI elements (e.g., prescription tools)
    await expect(practitionerPage.getByRole("button", { name: /prescribe/i })).toBeVisible();
  });

  fixtureTest.skip("adminPage has admin controls", async ({ adminPage }) => {
    await adminPage.goto("/admin");
    // Admin-specific UI elements
    await expect(adminPage.getByRole("link", { name: /manage users/i })).toBeVisible();
  });
});

/**
 * Examples using appPage fixture
 *
 * The appPage fixture provides a page that's authenticated AND
 * already navigated to the app URL.
 */
fixtureTest.describe("App Page Fixture", () => {
  fixtureTest.skip("appPage is at app URL", async ({ appPage }) => {
    // Already at the app URL, no need to navigate
    await expect(appPage).toHaveURL(/\/s\/member-landing/);
    await expect(appPage.getByRole("main")).toBeVisible();
  });
});

/**
 * Configure appPage with specific user type
 */
fixtureTest.describe("App Page with Custom User Type", () => {
  // Override appPageOptions for these tests
  fixtureTest.use({
    appPageOptions: { userType: "admin" },
  });

  fixtureTest.skip("appPage uses admin user", async ({ appPage }) => {
    // appPage should be authenticated as admin
    await expect(appPage.getByText(/admin/i)).toBeVisible();
  });
});

/**
 * Examples using dynamic user selection fixtures
 *
 * These fixtures provide functions to select users by tags or type.
 */
fixtureTest.describe("Dynamic User Selection", () => {
  fixtureTest.skip("userWithTags finds user by capabilities", async ({ userWithTags, page }) => {
    // Get a user with specific capabilities
    const user = userWithTags(["hasSubscription", "hasPaymentMethod"]);

    expect(user.tags).toContain("hasSubscription");
    expect(user.tags).toContain("hasPaymentMethod");

    // Could use this user for payment flow tests
    // await loginToApp(page, appConfig, user);
  });

  fixtureTest.skip("userByType selects user of specific type", async ({ userByType }) => {
    const member = userByType("member");
    expect(member.type).toBe("member");

    const practitioner = userByType("practitioner");
    expect(practitioner.type).toBe("practitioner");
  });

  fixtureTest.skip("currentDomain and currentEnvironment reflect config", async ({
    currentDomain,
    currentEnvironment,
  }) => {
    // These reflect the resolved domain and environment from env vars or defaults
    expect(typeof currentDomain).toBe("string");
    expect(["dev", "staging", "prod"]).toContain(currentEnvironment);
  });
});

/**
 * Tests demonstrating fixture configuration patterns
 *
 * These tests verify the fixture setup works correctly without needing
 * a real server.
 */
test.describe("Fixture Configuration Verification", () => {
  test("appConfig has required properties", () => {
    expect(appConfig.slug).toBe("member-landing");
    expect(appConfig.type).toBe("spa");
    expect(appConfig.domains.length).toBeGreaterThan(0);
  });

  test("testUsers has users for dev environment", () => {
    const devUsers = testUsers.filter((u) => u.environment === "dev");
    expect(devUsers.length).toBeGreaterThan(0);
  });

  test("testUsers includes multiple user types", () => {
    const types = [...new Set(testUsers.map((u) => u.type))];
    expect(types).toContain("member");
    expect(types).toContain("practitioner");
    expect(types).toContain("admin");
  });
});

/**
 * Test case examples using fixtures
 */
test.describe("Fixture Test Cases", () => {
  testCase("TC-4001", "testUsers includes member users", () => {
    const members = testUsers.filter((u) => u.type === "member");
    expect(members.length).toBeGreaterThan(0);
  });

  testCase("TC-4002", "testUsers includes users with subscription", () => {
    const subscribed = testUsers.filter((u) => u.tags.includes("hasSubscription"));
    expect(subscribed.length).toBeGreaterThan(0);
  });

  testCase(
    ["TC-4003", "TC-4004"],
    "testUsers covers multiple domains",
    () => {
      // TC-4003: domain-alpha users exist
      const alphaUsers = testUsers.filter((u) => u.domain === "domain-alpha");
      expect(alphaUsers.length).toBeGreaterThan(0);

      // TC-4004: domain-beta users exist
      const betaUsers = testUsers.filter((u) => u.domain === "domain-beta");
      expect(betaUsers.length).toBeGreaterThan(0);
    }
  );
});
