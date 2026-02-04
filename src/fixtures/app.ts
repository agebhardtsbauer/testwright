import type { Page, BrowserContext } from "@playwright/test";
import { userTypeFixtures, type UserTypeFixtures } from "./userType.js";
import type { UserType, Environment } from "../types/index.js";
import { startAuthenticatedSession } from "../helpers/auth.js";
import { navigateToApp } from "../helpers/navigation.js";
import { getTargetDomain, getTargetEnvironment } from "../utils/urlBuilder.js";
import { getUsersByType } from "../utils/userFilter.js";

/**
 * Options for configuring the appPage fixture
 */
export interface AppPageOptions {
  /** User type to authenticate as */
  userType?: UserType;
  /** Target domain (overrides targetDomain option and TEST_DOMAIN) */
  domain?: string;
  /** Target environment (overrides targetEnvironment option and TEST_ENV) */
  environment?: Environment;
}

/**
 * App-level fixtures
 */
export interface AppFixtures {
  /** Page navigated to the configured app, authenticated as specified user */
  appPage: Page;
  /** Options for configuring appPage */
  appPageOptions: AppPageOptions;
}

/**
 * App fixtures extending user-type fixtures
 *
 * Provides a page that's both authenticated and navigated to the app.
 *
 * @example
 * ```typescript
 * import { test } from 'testwright/fixtures';
 *
 * test.use({ appConfig, testUsers });
 *
 * test('app loads correctly', async ({ appPage }) => {
 *   // appPage is authenticated and at the app URL
 *   await expect(appPage.getByRole('main')).toBeVisible();
 * });
 *
 * // Customize user type for specific tests
 * test.use({ appPageOptions: { userType: 'admin' } });
 * test('admin dashboard', async ({ appPage }) => {
 *   // appPage is authenticated as admin
 * });
 * ```
 */
export const appFixtures = userTypeFixtures.extend<AppFixtures>({
  // Option to configure appPage behavior
  appPageOptions: [{}, { option: true }],

  appPage: async (
    {
      browser,
      appConfig,
      testUsers,
      appPageOptions,
      targetDomain,
      targetEnvironment,
    },
    use
  ) => {
    // Resolve configuration
    const userType = appPageOptions.userType ?? "member";
    const domain =
      appPageOptions.domain ?? targetDomain ?? getTargetDomain(appConfig);
    const environment =
      appPageOptions.environment ?? targetEnvironment ?? getTargetEnvironment();

    // Find user
    const users = getUsersByType(
      testUsers,
      userType,
      environment,
      domain
    );

    if (users.length === 0) {
      throw new Error(
        `No ${userType} user found for ${domain}/${environment}. ` +
          `Configure appPageOptions.userType or add a matching user to testUsers.`
      );
    }

    const user = users[0]!;

    // Create context and page
    const context = await browser.newContext();

    // Authenticate
    await startAuthenticatedSession(context, appConfig, user, {
      domain,
      environment,
    });

    // Create page and navigate to app
    const page = await context.newPage();
    await navigateToApp(page, appConfig, { domain, environment });

    await use(page);
    await context.close();
  },
});
