import type { Page, BrowserContext } from "@playwright/test";
import {
  authenticatedFixtures,
  type AuthenticatedFixtureOptions,
} from "./authenticated.js";
import type { TestUser, UserType } from "../types/index.js";
import { startAuthenticatedSession } from "../helpers/auth.js";
import { getTargetDomain, getTargetEnvironment } from "../utils/urlBuilder.js";
import { getUsersByType } from "../utils/userFilter.js";

/**
 * User-type specific fixtures
 */
export interface UserTypeFixtures {
  /** Page authenticated as a member user */
  memberPage: Page;
  /** Page authenticated as a practitioner user */
  practitionerPage: Page;
  /** Page authenticated as a client user */
  clientPage: Page;
  /** Page authenticated as an admin user */
  adminPage: Page;
  /** Page authenticated as a guest user */
  guestPage: Page;
}

/**
 * Helper to create a page authenticated as a specific user type
 */
async function createUserTypePage(
  browser: { newContext(): Promise<BrowserContext> },
  appConfig: AuthenticatedFixtureOptions["appConfig"],
  testUsers: TestUser[],
  userType: UserType,
  targetDomain?: string,
  targetEnvironment?: AuthenticatedFixtureOptions["targetEnvironment"]
): Promise<{ page: Page; context: BrowserContext }> {
  const domain = targetDomain ?? getTargetDomain(appConfig);
  const environment = targetEnvironment ?? getTargetEnvironment();

  const users = getUsersByType(testUsers, userType, environment, domain);

  if (users.length === 0) {
    throw new Error(
      `No ${userType} user found for ${domain}/${environment}. ` +
        `Check that your testUsers array includes a user with type="${userType}", ` +
        `domain="${domain}", and environment="${environment}".`
    );
  }

  const user = users[0]!;
  const context = await browser.newContext();

  await startAuthenticatedSession(context, appConfig, user, {
    domain,
    environment,
  });

  const page = await context.newPage();
  return { page, context };
}

/**
 * User-type fixtures extending authenticated fixtures
 *
 * Provides convenience fixtures for common user types.
 *
 * @example
 * ```typescript
 * import { test } from 'testwright/fixtures';
 *
 * test.use({ appConfig, testUsers });
 *
 * test('member dashboard', async ({ memberPage }) => {
 *   // memberPage is authenticated as a member user
 * });
 *
 * test('admin panel', async ({ adminPage }) => {
 *   // adminPage is authenticated as an admin user
 * });
 * ```
 */
export const userTypeFixtures = authenticatedFixtures.extend<UserTypeFixtures>({
  memberPage: async (
    { browser, appConfig, testUsers, targetDomain, targetEnvironment },
    use
  ) => {
    const { page, context } = await createUserTypePage(
      browser,
      appConfig,
      testUsers,
      "member",
      targetDomain,
      targetEnvironment
    );
    await use(page);
    await context.close();
  },

  practitionerPage: async (
    { browser, appConfig, testUsers, targetDomain, targetEnvironment },
    use
  ) => {
    const { page, context } = await createUserTypePage(
      browser,
      appConfig,
      testUsers,
      "practitioner",
      targetDomain,
      targetEnvironment
    );
    await use(page);
    await context.close();
  },

  clientPage: async (
    { browser, appConfig, testUsers, targetDomain, targetEnvironment },
    use
  ) => {
    const { page, context } = await createUserTypePage(
      browser,
      appConfig,
      testUsers,
      "client",
      targetDomain,
      targetEnvironment
    );
    await use(page);
    await context.close();
  },

  adminPage: async (
    { browser, appConfig, testUsers, targetDomain, targetEnvironment },
    use
  ) => {
    const { page, context } = await createUserTypePage(
      browser,
      appConfig,
      testUsers,
      "admin",
      targetDomain,
      targetEnvironment
    );
    await use(page);
    await context.close();
  },

  guestPage: async (
    { browser, appConfig, testUsers, targetDomain, targetEnvironment },
    use
  ) => {
    const { page, context } = await createUserTypePage(
      browser,
      appConfig,
      testUsers,
      "guest",
      targetDomain,
      targetEnvironment
    );
    await use(page);
    await context.close();
  },
});
