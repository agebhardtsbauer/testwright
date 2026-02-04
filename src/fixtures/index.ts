/**
 * Playwright fixtures for testwright
 *
 * This module provides extended Playwright fixtures with
 * authentication, user management, and app navigation support.
 *
 * @example
 * ```typescript
 * import { test, expect } from 'testwright/fixtures';
 * import { appConfig } from './app.config';
 * import { testUsers } from './testUsers';
 *
 * // Configure fixtures with your app config and test users
 * test.use({
 *   appConfig,
 *   testUsers,
 * });
 *
 * test('user can view profile', async ({ memberPage }) => {
 *   await memberPage.goto('/profile');
 *   await expect(memberPage.getByRole('heading')).toHaveText('Profile');
 * });
 *
 * test('admin dashboard', async ({ adminPage }) => {
 *   await expect(adminPage.getByText('Admin Panel')).toBeVisible();
 * });
 * ```
 *
 * @packageDocumentation
 */

// Export the fully extended test with all fixtures
export { dynamicFixtures as test } from "./dynamic.js";

// Export individual fixture sets for customization
export { authenticatedFixtures } from "./authenticated.js";
export { userTypeFixtures } from "./userType.js";
export { appFixtures } from "./app.js";
export { dynamicFixtures } from "./dynamic.js";

// Export fixture types
export type {
  AuthenticatedFixtureOptions,
  AuthenticatedFixtures,
} from "./authenticated.js";
export type { UserTypeFixtures } from "./userType.js";
export type { AppPageOptions, AppFixtures } from "./app.js";
export type {
  DynamicFixtures,
  UserWithTagsFn,
  UserByTypeFn,
} from "./dynamic.js";

// Re-export expect for convenience
export { expect } from "@playwright/test";
