import { test, expect } from "@playwright/test";
import {
  buildAppUrl,
  getAppTypePrefix,
  testCase,
  validateTestCaseId,
  checkForDuplicates,
} from "testwright";
import { appConfig } from "../app.config.js";

/**
 * Example demonstrating multi-domain testing patterns
 *
 * This shows how to write tests that run against multiple domains,
 * useful for verifying consistent behavior across deployments.
 */

test.describe("Multi-Domain URL Generation", () => {
  // Test URL generation for each domain in the config
  for (const deployment of appConfig.domains) {
    test.describe(`${deployment.domain}`, () => {
      for (const envConfig of deployment.environments) {
        test(`generates correct URL for ${envConfig.environment}`, async () => {
          const url = buildAppUrl(appConfig, deployment.domain, envConfig.environment);

          // URL should contain the base URL and app slug
          expect(url).toContain(envConfig.baseUrl);
          expect(url).toContain(`/s/${appConfig.slug}`);

          // Full URL format: {baseUrl}/s/{slug}
          expect(url).toBe(`${envConfig.baseUrl}/s/${appConfig.slug}`);
        });
      }
    });
  }
});

test.describe("Cross-Domain Consistency", () => {
  /**
   * Pattern for testing the same behavior across domains
   *
   * In practice, you'd parameterize these tests using TEST_DOMAIN env var
   * or run the full suite for each domain in CI.
   */

  const domains = appConfig.domains.map((d) => d.domain);

  test("all domains have dev environment configured", async () => {
    for (const domain of domains) {
      const deployment = appConfig.domains.find((d) => d.domain === domain);
      const hasDevEnv = deployment?.environments.some((e) => e.environment === "dev");

      expect(hasDevEnv, `${domain} should have dev environment`).toBe(true);
    }
  });

  test("all dev URLs follow consistent pattern", async () => {
    const devUrls = appConfig.domains.map((d) => {
      const devEnv = d.environments.find((e) => e.environment === "dev");
      return { domain: d.domain, baseUrl: devEnv?.baseUrl };
    });

    for (const { domain, baseUrl } of devUrls) {
      if (baseUrl) {
        // All dev URLs should follow www-dev.{domain}.com pattern
        expect(baseUrl).toMatch(/https:\/\/www-dev\./);
        expect(baseUrl).toContain(domain);
      }
    }
  });
});

test.describe("App Type Prefixes", () => {
  test("SPA apps use /s/ prefix", async () => {
    const prefix = getAppTypePrefix("spa");
    expect(prefix).toBe("/s/");

    const url = buildAppUrl(appConfig, "domain-alpha", "dev");
    expect(url).toContain("/s/");
  });

  test("AEM apps use /x/ prefix", async () => {
    const prefix = getAppTypePrefix("aem");
    expect(prefix).toBe("/x/");

    const aemAppConfig = {
      ...appConfig,
      type: "aem" as const,
      slug: "content-page",
    };

    const url = buildAppUrl(aemAppConfig, "domain-alpha", "dev");
    expect(url).toBe("https://www-dev.domain-alpha.com/x/content-page");
  });
});

test.describe("Reporter Validation Utilities", () => {
  /**
   * These tests demonstrate the validation utilities used by the reporter
   */

  test("validateTestCaseId validates correct format", async () => {
    expect(validateTestCaseId("TC-1234")).toBe(true);
    expect(validateTestCaseId("TC-1")).toBe(true);
    expect(validateTestCaseId("TC-99999")).toBe(true);
  });

  test("validateTestCaseId rejects invalid format", async () => {
    expect(validateTestCaseId("INVALID")).toBe(false);
    expect(validateTestCaseId("tc-1234")).toBe(false);
    expect(validateTestCaseId("TC-")).toBe(false);
    expect(validateTestCaseId("")).toBe(false);
  });

  test("validateTestCaseId supports custom patterns", async () => {
    // JIRA-style pattern
    expect(validateTestCaseId("PROJ-123", "[A-Z]+-\\d+")).toBe(true);
    expect(validateTestCaseId("ABC-1", "[A-Z]+-\\d+")).toBe(true);

    // Custom prefix pattern
    expect(validateTestCaseId("TEST-ABC-123", "TEST-[A-Z]+-\\d+")).toBe(true);
  });

  test("checkForDuplicates finds duplicate IDs", async () => {
    const noDuplicates = checkForDuplicates(["TC-1", "TC-2", "TC-3"]);
    expect(noDuplicates).toHaveLength(0);

    const withDuplicates = checkForDuplicates(["TC-1", "TC-2", "TC-1", "TC-3"]);
    expect(withDuplicates).toContain("TC-1");
  });
});

/**
 * Multi-domain test cases with tracking
 */
test.describe("Multi-Domain Test Cases", () => {
  testCase("TC-3001", "domain-alpha dev URL is correct", async () => {
    const url = buildAppUrl(appConfig, "domain-alpha", "dev");
    expect(url).toBe("https://www-dev.domain-alpha.com/s/member-landing");
  });

  testCase("TC-3002", "domain-beta dev URL is correct", async () => {
    const url = buildAppUrl(appConfig, "domain-beta", "dev");
    expect(url).toBe("https://www-dev.domain-beta.com/s/member-landing");
  });

  testCase("TC-3003", "staging URLs use correct subdomain", async () => {
    const alphaStaging = buildAppUrl(appConfig, "domain-alpha", "staging");
    const betaStaging = buildAppUrl(appConfig, "domain-beta", "staging");

    expect(alphaStaging).toContain("www-staging");
    expect(betaStaging).toContain("www-staging");
  });

  testCase(
    ["TC-3004", "TC-3005"],
    "production URLs use www subdomain",
    async () => {
      // TC-3004: domain-alpha prod URL
      const alphaProd = buildAppUrl(appConfig, "domain-alpha", "prod");
      expect(alphaProd).toBe("https://www.domain-alpha.com/s/member-landing");

      // TC-3005: domain-beta prod URL
      const betaProd = buildAppUrl(appConfig, "domain-beta", "prod");
      expect(betaProd).toBe("https://www.domain-beta.com/s/member-landing");
    }
  );
});
