import type { TestUser, UserType, Environment } from "../types/index.js";
import { appFixtures, type AppFixtures, type AppPageOptions } from "./app.js";
import { getTargetDomain, getTargetEnvironment } from "../utils/urlBuilder.js";
import { getUsersByTags, getUsersByType } from "../utils/userFilter.js";

/**
 * Function type for getting a user by tags
 */
export type UserWithTagsFn = (tags: string[]) => TestUser;

/**
 * Function type for getting a user by type
 */
export type UserByTypeFn = (type: UserType) => TestUser;

/**
 * Dynamic user selection fixtures
 */
export interface DynamicFixtures {
  /** Get a test user matching the specified tags */
  userWithTags: UserWithTagsFn;
  /** Get a test user of the specified type */
  userByType: UserByTypeFn;
  /** Current target domain (from config or TEST_DOMAIN) */
  currentDomain: string;
  /** Current target environment (from config or TEST_ENV) */
  currentEnvironment: Environment;
}

/**
 * Dynamic fixtures extending app fixtures
 *
 * Provides helper functions for dynamically selecting test users
 * based on tags or type.
 *
 * @example
 * ```typescript
 * import { test } from 'testwright/fixtures';
 *
 * test.use({ appConfig, testUsers });
 *
 * test('payment flow', async ({ page, userWithTags, loginToApp }) => {
 *   // Get a user with specific capabilities
 *   const user = userWithTags(['hasPaymentMethod', 'hasSubscription']);
 *   await loginToApp(page, appConfig, user);
 * });
 *
 * test('practitioner flow', async ({ userByType }) => {
 *   const practitioner = userByType('practitioner');
 *   // Use practitioner for test
 * });
 * ```
 */
export const dynamicFixtures = appFixtures.extend<DynamicFixtures>({
  // Current domain (resolved from options or env vars)
  currentDomain: async ({ appConfig, targetDomain }, use) => {
    const domain = targetDomain ?? getTargetDomain(appConfig);
    await use(domain);
  },

  // Current environment (resolved from options or env vars)
  currentEnvironment: async ({ targetEnvironment }, use) => {
    const environment = targetEnvironment ?? getTargetEnvironment();
    await use(environment);
  },

  // Function to get user by tags
  userWithTags: async (
    { testUsers, currentDomain, currentEnvironment },
    use
  ) => {
    const fn: UserWithTagsFn = (tags: string[]) => {
      const users = getUsersByTags(
        testUsers,
        tags,
        currentEnvironment,
        currentDomain
      );

      if (users.length === 0) {
        throw new Error(
          `No user with tags [${tags.join(", ")}] found for ` +
            `${currentDomain}/${currentEnvironment}. ` +
            `Available users: ${testUsers
              .filter(
                (u) =>
                  u.domain === currentDomain &&
                  u.environment === currentEnvironment
              )
              .map((u) => `${u.id} (tags: ${u.tags.join(", ")})`)
              .join("; ")}`
        );
      }

      return users[0]!;
    };

    await use(fn);
  },

  // Function to get user by type
  userByType: async ({ testUsers, currentDomain, currentEnvironment }, use) => {
    const fn: UserByTypeFn = (type: UserType) => {
      const users = getUsersByType(
        testUsers,
        type,
        currentEnvironment,
        currentDomain
      );

      if (users.length === 0) {
        throw new Error(
          `No ${type} user found for ${currentDomain}/${currentEnvironment}. ` +
            `Available user types: ${[
              ...new Set(
                testUsers
                  .filter(
                    (u) =>
                      u.domain === currentDomain &&
                      u.environment === currentEnvironment
                  )
                  .map((u) => u.type)
              ),
            ].join(", ")}`
        );
      }

      return users[0]!;
    };

    await use(fn);
  },
});
