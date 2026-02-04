import { describe, it, expect } from "vitest";
import {
  generateEnvironmentUrls,
  generateAppConfig,
  generateTestUsers,
  generatePlaywrightConfig,
  generateTsConfig,
  generatePackageJson,
  generateGitignore,
  generateExampleSpec,
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

describe("generatePackageJson", () => {
  const options: ScaffoldOptions = {
    appSlug: "member-portal",
    appType: "spa",
    requiresAuth: true,
    domains: [],
  };

  it("should generate valid JSON", () => {
    const result = generatePackageJson(options);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("should name package based on app slug", () => {
    const result = generatePackageJson(options);
    const pkg = JSON.parse(result);
    expect(pkg.name).toBe("member-portal-tests");
  });

  it("should include testwright as devDependency", () => {
    const result = generatePackageJson(options);
    const pkg = JSON.parse(result);
    expect(pkg.devDependencies.testwright).toBeDefined();
  });

  it("should include test scripts", () => {
    const result = generatePackageJson(options);
    const pkg = JSON.parse(result);
    expect(pkg.scripts.test).toBe("playwright test");
    expect(pkg.scripts["test:headed"]).toBeDefined();
  });
});

describe("generateGitignore", () => {
  it("should include common entries", () => {
    const result = generateGitignore();
    expect(result).toContain("node_modules/");
    expect(result).toContain(".auth/");
    expect(result).toContain("test-results/");
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
