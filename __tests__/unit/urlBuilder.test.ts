import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  buildAppUrl,
  buildAppUrlFromEnv,
  getTargetDomain,
  getTargetEnvironment,
  getAppTypePrefix,
} from "../../src/utils/urlBuilder";
import type { AppConfig } from "../../src/types";

const mockAppConfig: AppConfig = {
  slug: "test-app",
  type: "spa",
  requiresAuth: true,
  domains: [
    {
      domain: "domain-alpha",
      environments: [
        { environment: "dev", baseUrl: "https://www-dev.domain-alpha.com" },
        {
          environment: "staging",
          baseUrl: "https://www-staging.domain-alpha.com",
        },
        { environment: "prod", baseUrl: "https://www.domain-alpha.com" },
      ],
    },
    {
      domain: "domain-beta",
      environments: [
        { environment: "dev", baseUrl: "https://www-dev.domain-beta.com" },
      ],
    },
  ],
};

const aemAppConfig: AppConfig = {
  ...mockAppConfig,
  slug: "about-us",
  type: "aem",
};

describe("urlBuilder", () => {
  describe("getAppTypePrefix", () => {
    it("returns /s/ for spa type", () => {
      expect(getAppTypePrefix("spa")).toBe("/s/");
    });

    it("returns /x/ for aem type", () => {
      expect(getAppTypePrefix("aem")).toBe("/x/");
    });
  });

  describe("buildAppUrl", () => {
    it("builds correct URL for SPA app", () => {
      const url = buildAppUrl(mockAppConfig, "domain-alpha", "dev");
      expect(url).toBe("https://www-dev.domain-alpha.com/s/test-app");
    });

    it("builds correct URL for AEM app", () => {
      const url = buildAppUrl(aemAppConfig, "domain-alpha", "dev");
      expect(url).toBe("https://www-dev.domain-alpha.com/x/about-us");
    });

    it("builds correct URL for staging environment", () => {
      const url = buildAppUrl(mockAppConfig, "domain-alpha", "staging");
      expect(url).toBe("https://www-staging.domain-alpha.com/s/test-app");
    });

    it("builds correct URL for prod environment", () => {
      const url = buildAppUrl(mockAppConfig, "domain-alpha", "prod");
      expect(url).toBe("https://www.domain-alpha.com/s/test-app");
    });

    it("builds correct URL for different domain", () => {
      const url = buildAppUrl(mockAppConfig, "domain-beta", "dev");
      expect(url).toBe("https://www-dev.domain-beta.com/s/test-app");
    });

    it("throws for unknown domain", () => {
      expect(() => buildAppUrl(mockAppConfig, "unknown-domain", "dev")).toThrow(
        /Domain "unknown-domain" not found/
      );
    });

    it("throws with helpful message listing available domains", () => {
      try {
        buildAppUrl(mockAppConfig, "unknown-domain", "dev");
      } catch (error) {
        expect((error as Error).message).toContain("domain-alpha");
        expect((error as Error).message).toContain("domain-beta");
      }
    });

    it("throws for unknown environment", () => {
      expect(() =>
        buildAppUrl(mockAppConfig, "domain-alpha", "prod" as never)
      ).not.toThrow();
      expect(() =>
        buildAppUrl(mockAppConfig, "domain-beta", "staging")
      ).toThrow(/Environment "staging" not found/);
    });

    it("handles baseUrl with trailing slash", () => {
      const configWithTrailingSlash: AppConfig = {
        ...mockAppConfig,
        domains: [
          {
            domain: "test-domain",
            environments: [
              {
                environment: "dev",
                baseUrl: "https://example.com/",
              },
            ],
          },
        ],
      };
      const url = buildAppUrl(configWithTrailingSlash, "test-domain", "dev");
      expect(url).toBe("https://example.com/s/test-app");
    });
  });

  describe("getTargetEnvironment", () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns dev by default", () => {
      expect(getTargetEnvironment()).toBe("dev");
    });

    it("returns environment from TEST_ENV", () => {
      vi.stubEnv("TEST_ENV", "staging");
      expect(getTargetEnvironment()).toBe("staging");
    });

    it("returns prod from TEST_ENV", () => {
      vi.stubEnv("TEST_ENV", "prod");
      expect(getTargetEnvironment()).toBe("prod");
    });

    it("returns dev for invalid TEST_ENV value", () => {
      vi.stubEnv("TEST_ENV", "invalid");
      expect(getTargetEnvironment()).toBe("dev");
    });
  });

  describe("getTargetDomain", () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns first domain by default", () => {
      expect(getTargetDomain(mockAppConfig)).toBe("domain-alpha");
    });

    it("returns domain from TEST_DOMAIN", () => {
      vi.stubEnv("TEST_DOMAIN", "domain-beta");
      expect(getTargetDomain(mockAppConfig)).toBe("domain-beta");
    });

    it("returns env var domain even if not in config", () => {
      vi.stubEnv("TEST_DOMAIN", "custom-domain");
      expect(getTargetDomain(mockAppConfig)).toBe("custom-domain");
    });

    it("throws for empty domains array", () => {
      const emptyConfig: AppConfig = {
        ...mockAppConfig,
        domains: [],
      };
      expect(() => getTargetDomain(emptyConfig)).toThrow(
        /No domains configured/
      );
    });
  });

  describe("buildAppUrlFromEnv", () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("uses defaults when no env vars set", () => {
      const url = buildAppUrlFromEnv(mockAppConfig);
      expect(url).toBe("https://www-dev.domain-alpha.com/s/test-app");
    });

    it("uses TEST_DOMAIN env var", () => {
      vi.stubEnv("TEST_DOMAIN", "domain-beta");
      const url = buildAppUrlFromEnv(mockAppConfig);
      expect(url).toBe("https://www-dev.domain-beta.com/s/test-app");
    });

    it("uses TEST_ENV env var", () => {
      vi.stubEnv("TEST_ENV", "staging");
      const url = buildAppUrlFromEnv(mockAppConfig);
      expect(url).toBe("https://www-staging.domain-alpha.com/s/test-app");
    });

    it("uses both env vars", () => {
      vi.stubEnv("TEST_DOMAIN", "domain-alpha");
      vi.stubEnv("TEST_ENV", "prod");
      const url = buildAppUrlFromEnv(mockAppConfig);
      expect(url).toBe("https://www.domain-alpha.com/s/test-app");
    });
  });
});
