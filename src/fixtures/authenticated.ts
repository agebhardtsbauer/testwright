import { type Page, type BrowserContext } from "@playwright/test";
import { baseFixtures } from "./base.js";
import type { AppConfig, TestUser, Environment } from "../types/index.js";
import { startAuthenticatedSession } from "../helpers/auth.js";
import { getTargetDomain, getTargetEnvironment } from "../utils/urlBuilder.js";
import { getUsersByType } from "../utils/userFilter.js";

/**
 * Configuration options for authenticated fixtures
 *
 * These options should be set using test.use() in your test files.
 */
export interface AuthenticatedFixtureOptions {
  /** Application configuration (required) */
  appConfig: AppConfig;
  /** Array of test users (required) */
  testUsers: TestUser[];
  /** Default user type for authenticatedPage fixture */
  defaultUserType: string;
  /** Target domain (uses TEST_DOMAIN env var if not specified) */
  targetDomain: string | undefined;
  /** Target environment (uses TEST_ENV env var if not specified) */
  targetEnvironment: Environment | undefined;
}

/**
 * Authenticated fixture types
 */
export interface AuthenticatedFixtures {
  /** Page with default user authenticated */
  authenticatedPage: Page;
  /** Browser context with authentication */
  authenticatedContext: BrowserContext;
}

/**
 * Base authenticated fixtures
 *
 * Provides fixtures for authenticated pages and contexts.
 *
 * @example
 * ```typescript
 * import { test } from 'testwright/fixtures';
 * import { appConfig } from './app.config';
 * import { testUsers } from './testUsers';
 *
 * test.use({
 *   appConfig,
 *   testUsers,
 *   defaultUserType: 'member'
 * });
 *
 * test('authenticated test', async ({ authenticatedPage }) => {
 *   // Page is already authenticated
 * });
 * ```
 */
export const authenticatedFixtures = baseFixtures.extend<
  AuthenticatedFixtures,
  AuthenticatedFixtureOptions
>({
  // Worker-scoped options (shared across tests in same worker)
  appConfig: [undefined as unknown as AppConfig, { option: true, scope: "worker" }],
  testUsers: [[] as TestUser[], { option: true, scope: "worker" }],
  defaultUserType: ["member", { option: true, scope: "worker" }],
  targetDomain: [undefined, { option: true, scope: "worker" }],
  targetEnvironment: [undefined, { option: true, scope: "worker" }],

  // Authenticated browser context
  authenticatedContext: async (
    { browser, appConfig, testUsers, defaultUserType, targetDomain, targetEnvironment },
    use
  ) => {
    // Validate required options
    if (!appConfig) {
      throw new Error(
        "authenticatedContext fixture requires appConfig to be set via test.use()"
      );
    }
    if (!testUsers || testUsers.length === 0) {
      throw new Error(
        "authenticatedContext fixture requires testUsers to be set via test.use()"
      );
    }

    const domain = targetDomain ?? getTargetDomain(appConfig);
    const environment = targetEnvironment ?? getTargetEnvironment();

    // Find a user for this domain/environment
    const users = getUsersByType(
      testUsers,
      defaultUserType as TestUser["type"],
      environment,
      domain
    );

    if (users.length === 0) {
      throw new Error(
        `No ${defaultUserType} user found for ${domain}/${environment}. ` +
          `Available users: ${testUsers.map((u) => `${u.type}@${u.domain}/${u.environment}`).join(", ")}`
      );
    }

    const user = users[0]!;

    // Create a new browser context
    const context = await browser.newContext();

    // Authenticate and navigate to app
    await startAuthenticatedSession(context, appConfig, user, {
      domain,
      environment,
    });

    await use(context);
    await context.close();
  },

  // Authenticated page (uses authenticatedContext)
  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    await use(page);
  },
});
