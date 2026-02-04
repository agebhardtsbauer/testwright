import type { AppType } from "../types/app.js";

export interface DomainConfig {
  name: string;
  devUrl: string;
  stagingUrl: string;
  prodUrl: string;
}

export interface ScaffoldOptions {
  appSlug: string;
  appType: AppType;
  requiresAuth: boolean;
  domains: DomainConfig[];
}

/**
 * Generate environment URLs from a dev URL
 * Input: https://www-dev.acme.com
 * Output: { dev: "https://www-dev.acme.com", staging: "https://www-staging.acme.com", prod: "https://www.acme.com" }
 */
export function generateEnvironmentUrls(devUrl: string): {
  dev: string;
  staging: string;
  prod: string;
} {
  const dev = devUrl;

  // Try to generate staging and prod URLs from dev URL pattern
  // Common patterns:
  // - https://www-dev.example.com -> https://www-staging.example.com, https://www.example.com
  // - https://dev.example.com -> https://staging.example.com, https://www.example.com
  // - https://dev-app.example.com -> https://staging-app.example.com, https://app.example.com

  let staging = devUrl;
  let prod = devUrl;

  if (devUrl.includes("www-dev.")) {
    staging = devUrl.replace("www-dev.", "www-staging.");
    prod = devUrl.replace("www-dev.", "www.");
  } else if (devUrl.includes("-dev.")) {
    staging = devUrl.replace("-dev.", "-staging.");
    prod = devUrl.replace(/-dev\./, ".");
  } else if (devUrl.includes("dev.")) {
    staging = devUrl.replace("dev.", "staging.");
    prod = devUrl.replace("dev.", "www.");
  } else if (devUrl.includes("dev-")) {
    staging = devUrl.replace("dev-", "staging-");
    prod = devUrl.replace(/dev-/, "");
  }

  return { dev, staging, prod };
}

export function generateAppConfig(options: ScaffoldOptions): string {
  const domainsStr = options.domains
    .map(
      (d) => `    {
      domain: "${d.name}",
      environments: [
        { environment: "dev", baseUrl: "${d.devUrl}" },
        { environment: "staging", baseUrl: "${d.stagingUrl}" },
        { environment: "prod", baseUrl: "${d.prodUrl}" },
      ],
    }`
    )
    .join(",\n");

  return `import type { AppConfig } from "testwright";

export const appConfig: AppConfig = {
  slug: "${options.appSlug}",
  type: "${options.appType}",
  requiresAuth: ${options.requiresAuth},
  domains: [
${domainsStr},
  ],
};
`;
}

export function generateTestUsers(options: ScaffoldOptions): string {
  const users: string[] = [];

  for (const domain of options.domains) {
    for (const env of ["dev", "staging"] as const) {
      users.push(`  {
    id: "member-1-${env}-${domain.name}",
    email: "member1@test.${domain.name}.com",
    type: "member",
    tags: ["isActive"],
    environment: "${env}",
    domain: "${domain.name}",
  }`);
    }
  }

  return `import type { TestUser } from "testwright";

/**
 * Test user registry
 *
 * Users are scoped to specific environment + domain combinations.
 * Most users share DEFAULT_TEST_PASSWORD (env var) unless password is specified.
 *
 * Add your test users here with appropriate tags for filtering:
 * - isActive: User account is active
 * - hasSubscription: User has an active subscription
 * - hasPaymentMethod: User has payment method on file
 */
export const testUsers: TestUser[] = [
${users.join(",\n")},
];
`;
}

export function generatePlaywrightConfig(options: ScaffoldOptions): string {
  const firstDomain = options.domains[0]?.name || "default";

  return `import { defineConfig, devices } from "@playwright/test";
import { defaultConfig } from "testwright/config";
import { buildAppUrl } from "testwright";
import { appConfig } from "./app.config.js";

const targetDomain = process.env.TEST_DOMAIN || "${firstDomain}";
const targetEnv = (process.env.TEST_ENV as "dev" | "staging" | "prod") || "dev";
const baseURL = buildAppUrl(appConfig, targetDomain, targetEnv);

export default defineConfig({
  ...defaultConfig,
  testDir: "./tests",
  use: {
    ...defaultConfig.use,
    baseURL,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: [
    ["html"],
    [
      "testwright/reporter",
      {
        outputFile: "./test-results/test-case-results.json",
      },
    ],
  ],
});
`;
}

export function generateTsConfig(): string {
  return `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "."
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
`;
}

export function generatePackageJson(options: ScaffoldOptions): string {
  const packageName = `${options.appSlug}-tests`;

  return `{
  "name": "${packageName}",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:debug": "playwright test --debug",
    "test:ui": "playwright test --ui",
    "report": "playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0",
    "testwright": "^0.1.0",
    "typescript": "^5.7.0"
  }
}
`;
}

export function generateGitignore(): string {
  return `# Dependencies
node_modules/

# Build output
dist/

# Test results
test-results/
playwright-report/
playwright/.cache/

# Authentication cache
.auth/

# Environment files
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`;
}

export function generateExampleSpec(options: ScaffoldOptions): string {
  const firstDomain = options.domains[0]?.name || "default";

  if (options.requiresAuth) {
    return `import { test, expect } from "@playwright/test";
import { testCase, loginToApp } from "testwright";
import { appConfig } from "../app.config.js";
import { testUsers } from "../testUsers.js";

const targetDomain = process.env.TEST_DOMAIN || "${firstDomain}";
const targetEnv = (process.env.TEST_ENV as "dev" | "staging" | "prod") || "dev";

// Find a test user for the current domain and environment
const user = testUsers.find(
  (u) => u.domain === targetDomain && u.environment === targetEnv
);

testCase("TC-0001", "${options.appSlug} loads successfully", async ({ page }) => {
  if (!user) {
    throw new Error(\`No test user found for \${targetDomain}/\${targetEnv}\`);
  }

  await loginToApp(page, appConfig, user, {
    domain: targetDomain,
    environment: targetEnv,
  });

  // Verify the page loaded
  await expect(page).toHaveURL(new RegExp("${options.appSlug}"));
});

testCase("TC-0002", "page has expected title", async ({ page }) => {
  if (!user) {
    throw new Error(\`No test user found for \${targetDomain}/\${targetEnv}\`);
  }

  await loginToApp(page, appConfig, user, {
    domain: targetDomain,
    environment: targetEnv,
  });

  // Update this assertion based on your app's actual title
  await expect(page).toHaveTitle(/.+/);
});
`;
  }

  return `import { test, expect } from "@playwright/test";
import { testCase, navigateToApp } from "testwright";
import { appConfig } from "../app.config.js";

const targetDomain = process.env.TEST_DOMAIN || "${firstDomain}";
const targetEnv = (process.env.TEST_ENV as "dev" | "staging" | "prod") || "dev";

testCase("TC-0001", "${options.appSlug} loads successfully", async ({ page }) => {
  await navigateToApp(page, appConfig, {
    domain: targetDomain,
    environment: targetEnv,
  });

  // Verify the page loaded
  await expect(page).toHaveURL(new RegExp("${options.appSlug}"));
});

testCase("TC-0002", "page has expected title", async ({ page }) => {
  await navigateToApp(page, appConfig, {
    domain: targetDomain,
    environment: targetEnv,
  });

  // Update this assertion based on your app's actual title
  await expect(page).toHaveTitle(/.+/);
});
`;
}
