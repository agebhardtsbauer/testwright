import { describe, it, expect } from "vitest";
import {
  generateEnvironmentUrls,
  generateAppConfig,
  generateTestUsers,
  generatePlaywrightConfig,
  generateTsConfig,
  generateGitignore,
  generateExampleSpec,
  getPackageJsonInstructions,
  formatPackageJsonInstructions,
  type ScaffoldOptions,
} from "../../src/cli/templates.js";

describe("generateEnvironmentUrls", () => {
  it("should generate URLs from www-dev pattern", () => {
    const result = generateEnvironmentUrls("https://www-dev.acme.com");
    expect(result).toEqual({
      dev: "https://www-dev.acme.com",
      staging: "https://www-staging.acme.com",
      prod: "https://www.acme.com",
    });
  });

  it("should generate URLs from -dev pattern", () => {
    const result = generateEnvironmentUrls("https://app-dev.example.com");
    expect(result).toEqual({
      dev: "https://app-dev.example.com",
      staging: "https://app-staging.example.com",
      prod: "https://app.example.com",
    });
  });

  it("should generate URLs from dev. prefix pattern", () => {
    const result = generateEnvironmentUrls("https://dev.example.com");
    expect(result).toEqual({
      dev: "https://dev.example.com",
      staging: "https://staging.example.com",
      prod: "https://www.example.com",
    });
  });

  it("should generate URLs from dev- prefix pattern", () => {
    const result = generateEnvironmentUrls("https://dev-app.example.com");
    expect(result).toEqual({
      dev: "https://dev-app.example.com",
      staging: "https://staging-app.example.com",
      prod: "https://app.example.com",
    });
  });

  it("should return same URL when no pattern matches", () => {
    const result = generateEnvironmentUrls("https://custom.example.com");
    expect(result).toEqual({
      dev: "https://custom.example.com",
      staging: "https://custom.example.com",
      prod: "https://custom.example.com",
    });
  });
});

describe("generateAppConfig", () => {
  const options: ScaffoldOptions = {
    appSlug: "member-portal",
    appType: "spa",
    requiresAuth: true,
    domains: [
      {
        name: "acme",
        devUrl: "https://www-dev.acme.com",
        stagingUrl: "https://www-staging.acme.com",
        prodUrl: "https://www.acme.com",
      },
    ],
  };

  it("should generate valid TypeScript config", () => {
    const result = generateAppConfig(options);
    expect(result).toContain('import type { AppConfig } from "testwright"');
    expect(result).toContain('slug: "member-portal"');
    expect(result).toContain('type: "spa"');
    expect(result).toContain("requiresAuth: true");
    expect(result).toContain('domain: "acme"');
  });

  it("should include all environments", () => {
    const result = generateAppConfig(options);
    expect(result).toContain('environment: "dev"');
    expect(result).toContain('environment: "staging"');
    expect(result).toContain('environment: "prod"');
  });
});

describe("generateTestUsers", () => {
  const options: ScaffoldOptions = {
    appSlug: "member-portal",
    appType: "spa",
    requiresAuth: true,
    domains: [
      {
        name: "acme",
        devUrl: "https://www-dev.acme.com",
        stagingUrl: "https://www-staging.acme.com",
        prodUrl: "https://www.acme.com",
      },
    ],
  };

  it("should generate valid TypeScript file", () => {
    const result = generateTestUsers(options);
    expect(result).toContain('import type { TestUser } from "testwright"');
    expect(result).toContain("export const testUsers: TestUser[]");
  });

  it("should generate users for dev and staging environments", () => {
    const result = generateTestUsers(options);
    expect(result).toContain('id: "member-1-dev-acme"');
    expect(result).toContain('id: "member-1-staging-acme"');
  });

  it("should generate users for each domain", () => {
    const multiDomainOptions: ScaffoldOptions = {
      ...options,
      domains: [
        { name: "acme", devUrl: "", stagingUrl: "", prodUrl: "" },
        { name: "beta", devUrl: "", stagingUrl: "", prodUrl: "" },
      ],
    };
    const result = generateTestUsers(multiDomainOptions);
    expect(result).toContain('domain: "acme"');
    expect(result).toContain('domain: "beta"');
  });
});

describe("generatePlaywrightConfig", () => {
  const options: ScaffoldOptions = {
    appSlug: "member-portal",
    appType: "spa",
    requiresAuth: true,
    domains: [
      {
        name: "acme",
        devUrl: "https://www-dev.acme.com",
        stagingUrl: "https://www-staging.acme.com",
        prodUrl: "https://www.acme.com",
      },
    ],
  };

  it("should import from testwright", () => {
    const result = generatePlaywrightConfig(options);
    expect(result).toContain('from "testwright/config"');
    expect(result).toContain('from "testwright"');
  });

  it("should use first domain as default", () => {
    const result = generatePlaywrightConfig(options);
    expect(result).toContain('process.env.TEST_DOMAIN || "acme"');
  });

  it("should configure reporter", () => {
    const result = generatePlaywrightConfig(options);
    expect(result).toContain('"testwright/reporter"');
    expect(result).toContain("test-case-results.json");
  });

  it("should configure output directories", () => {
    const result = generatePlaywrightConfig(options);
    expect(result).toContain('outputDir: "./test-results"');
    expect(result).toContain('outputFolder: "./playwright-report"');
  });
});

describe("generateTsConfig", () => {
  it("should generate valid JSON", () => {
    const result = generateTsConfig();
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("should target Node.js", () => {
    const result = generateTsConfig();
    const config = JSON.parse(result);
    expect(config.compilerOptions.module).toBe("NodeNext");
    expect(config.compilerOptions.moduleResolution).toBe("NodeNext");
  });
});

describe("getPackageJsonInstructions", () => {
  it("should return scripts with playwright config path", () => {
    const result = getPackageJsonInstructions();
    expect(result.scripts["test:e2e"]).toContain("playwright/playwright.config.ts");
  });

  it("should include all test script variants", () => {
    const result = getPackageJsonInstructions();
    expect(result.scripts["test:e2e"]).toBeDefined();
    expect(result.scripts["test:e2e:headed"]).toBeDefined();
    expect(result.scripts["test:e2e:debug"]).toBeDefined();
    expect(result.scripts["test:e2e:ui"]).toBeDefined();
    expect(result.scripts["test:e2e:report"]).toBeDefined();
  });

  it("should include required devDependencies", () => {
    const result = getPackageJsonInstructions();
    expect(result.devDependencies).toContain("@playwright/test");
    expect(result.devDependencies).toContain("testwright");
    expect(result.devDependencies).toContain("typescript");
  });
});

describe("formatPackageJsonInstructions", () => {
  it("should format instructions with scripts JSON", () => {
    const instructions = getPackageJsonInstructions();
    const result = formatPackageJsonInstructions(instructions);
    expect(result).toContain('"test:e2e"');
    expect(result).toContain("scripts");
  });

  it("should include npm install command", () => {
    const instructions = getPackageJsonInstructions();
    const result = formatPackageJsonInstructions(instructions);
    expect(result).toContain("npm install --save-dev");
    expect(result).toContain("@playwright/test");
    expect(result).toContain("testwright");
  });
});

describe("generateGitignore", () => {
  it("should include playwright-specific entries", () => {
    const result = generateGitignore();
    expect(result).toContain(".auth/");
    expect(result).toContain("test-results/");
    expect(result).toContain("playwright-report/");
    expect(result).toContain(".env");
  });
});

describe("generateExampleSpec", () => {
  describe("with auth required", () => {
    const options: ScaffoldOptions = {
      appSlug: "member-portal",
      appType: "spa",
      requiresAuth: true,
      domains: [
        {
          name: "acme",
          devUrl: "https://www-dev.acme.com",
          stagingUrl: "https://www-staging.acme.com",
          prodUrl: "https://www.acme.com",
        },
      ],
    };

    it("should import loginToApp", () => {
      const result = generateExampleSpec(options);
      expect(result).toContain("loginToApp");
    });

    it("should import testUsers", () => {
      const result = generateExampleSpec(options);
      expect(result).toContain('from "../testUsers.js"');
    });

    it("should use testCase helper", () => {
      const result = generateExampleSpec(options);
      expect(result).toContain("testCase");
      expect(result).toContain("TC-0001");
    });
  });

  describe("without auth required", () => {
    const options: ScaffoldOptions = {
      appSlug: "public-app",
      appType: "spa",
      requiresAuth: false,
      domains: [
        {
          name: "acme",
          devUrl: "https://www-dev.acme.com",
          stagingUrl: "https://www-staging.acme.com",
          prodUrl: "https://www.acme.com",
        },
      ],
    };

    it("should import navigateToApp instead of loginToApp", () => {
      const result = generateExampleSpec(options);
      expect(result).toContain("navigateToApp");
      expect(result).not.toContain("loginToApp");
    });

    it("should not import testUsers", () => {
      const result = generateExampleSpec(options);
      expect(result).not.toContain("testUsers");
    });
  });
});
