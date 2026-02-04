import type { TestUser, UserType, Environment } from "../types/index.js";

/**
 * Filter users by tags for a specific environment and domain
 *
 * Returns users that match ALL specified tags and are scoped to
 * the given environment and domain.
 *
 * @param users - Array of test users to filter
 * @param tags - Tags that users must have (all must match)
 * @param environment - Target environment
 * @param domain - Target domain
 * @returns Filtered array of users matching criteria
 *
 * @example
 * ```typescript
 * const subscribedMembers = getUsersByTags(
 *   testUsers,
 *   ['hasSubscription', 'isActive'],
 *   'dev',
 *   'domain-alpha'
 * );
 * ```
 */
export function getUsersByTags(
  users: TestUser[],
  tags: string[],
  environment: Environment,
  domain: string
): TestUser[] {
  return users.filter(
    (user) =>
      user.environment === environment &&
      user.domain === domain &&
      tags.every((tag) => user.tags.includes(tag))
  );
}

/**
 * Filter users by type for a specific environment and domain
 *
 * @param users - Array of test users to filter
 * @param type - User type to filter by
 * @param environment - Target environment
 * @param domain - Target domain
 * @returns Filtered array of users matching criteria
 *
 * @example
 * ```typescript
 * const members = getUsersByType(testUsers, 'member', 'dev', 'domain-alpha');
 * ```
 */
export function getUsersByType(
  users: TestUser[],
  type: UserType,
  environment: Environment,
  domain: string
): TestUser[] {
  return users.filter(
    (user) =>
      user.type === type &&
      user.environment === environment &&
      user.domain === domain
  );
}

/**
 * Get a single user by ID
 *
 * @param users - Array of test users to search
 * @param id - User ID to find
 * @returns The matching user or undefined
 */
export function getUserById(
  users: TestUser[],
  id: string
): TestUser | undefined {
  return users.find((user) => user.id === id);
}

/**
 * Get the first user matching the environment and domain
 *
 * Useful for getting any valid user when the specific user doesn't matter.
 *
 * @param users - Array of test users to search
 * @param environment - Target environment
 * @param domain - Target domain
 * @returns The first matching user or undefined
 */
export function getFirstUser(
  users: TestUser[],
  environment: Environment,
  domain: string
): TestUser | undefined {
  return users.find(
    (user) => user.environment === environment && user.domain === domain
  );
}

/**
 * Get password for a test user
 *
 * Returns the user's specific password if set, otherwise falls back
 * to the DEFAULT_TEST_PASSWORD environment variable.
 *
 * @param user - Test user to get password for
 * @returns The user's password or empty string if not set
 */
export function getUserPassword(user: TestUser): string {
  return user.password ?? process.env["DEFAULT_TEST_PASSWORD"] ?? "";
}
