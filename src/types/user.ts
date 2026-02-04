import type { Environment } from "./app.js";

/**
 * User types for test accounts
 */
export type UserType = "member" | "client" | "practitioner" | "admin" | "guest";

/**
 * Test user definition
 *
 * Test users are scoped to specific environment + domain combinations.
 * Most users share a common password (DEFAULT_TEST_PASSWORD env var),
 * with individual passwords overriding when specified.
 */
export interface TestUser {
  /** Unique identifier for the test user */
  id: string;
  /** Email address used for login */
  email: string;
  /** First name (optional - many test users don't need names) */
  firstName?: string;
  /** Last name (optional) */
  lastName?: string;
  /** Middle name (optional) */
  middleName?: string;
  /**
   * Password for this user.
   * If not specified, uses DEFAULT_TEST_PASSWORD environment variable.
   */
  password?: string;
  /** User type classification */
  type: UserType;
  /**
   * Feature tags for filtering users by capabilities.
   * Examples: ['hasPaymentMethod', 'hasSubscription', 'isActive', 'canPrescribe']
   */
  tags: string[];
  /** Environment this user exists in (users are environment-specific) */
  environment: Environment;
  /** Domain this user belongs to (users are domain-specific) */
  domain: string;
}
