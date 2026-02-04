import type { TestUser } from "testwright";

/**
 * Example test user registry
 *
 * Test users are scoped to specific environment + domain combinations.
 * Most users share DEFAULT_TEST_PASSWORD; individual passwords override when specified.
 *
 * Note: Helper functions like getUsersByTags, getUsersByType, getUserPassword
 * are now imported from testwright instead of defined here.
 */
export const testUsers: TestUser[] = [
  // Domain Alpha - Dev Environment
  {
    id: "member-1-dev-alpha",
    email: "member1@test.domain-alpha.com",
    firstName: "Test",
    lastName: "Member",
    type: "member",
    tags: ["isActive", "hasSubscription", "hasPaymentMethod"],
    environment: "dev",
    domain: "domain-alpha",
  },
  {
    id: "member-2-dev-alpha",
    email: "member2@test.domain-alpha.com",
    type: "member",
    tags: ["isActive"],
    environment: "dev",
    domain: "domain-alpha",
  },
  {
    id: "practitioner-1-dev-alpha",
    email: "practitioner1@test.domain-alpha.com",
    firstName: "Test",
    lastName: "Practitioner",
    // Only include password if env var is set (satisfies exactOptionalPropertyTypes)
    ...(process.env["PRACTITIONER_TEST_PASSWORD"]
      ? { password: process.env["PRACTITIONER_TEST_PASSWORD"] }
      : {}),
    type: "practitioner",
    tags: ["isActive", "canPrescribe"],
    environment: "dev",
    domain: "domain-alpha",
  },
  {
    id: "admin-1-dev-alpha",
    email: "admin1@test.domain-alpha.com",
    type: "admin",
    tags: ["isActive", "canManageUsers"],
    environment: "dev",
    domain: "domain-alpha",
  },

  // Domain Alpha - Staging Environment
  {
    id: "member-1-staging-alpha",
    email: "member1@test.domain-alpha.com",
    type: "member",
    tags: ["isActive", "hasSubscription"],
    environment: "staging",
    domain: "domain-alpha",
  },

  // Domain Beta - Dev Environment
  {
    id: "member-1-dev-beta",
    email: "member1@test.domain-beta.com",
    firstName: "Beta",
    lastName: "Member",
    type: "member",
    tags: ["isActive", "hasSubscription"],
    environment: "dev",
    domain: "domain-beta",
  },
  {
    id: "client-1-dev-beta",
    email: "client1@test.domain-beta.com",
    type: "client",
    tags: ["isActive", "hasContract"],
    environment: "dev",
    domain: "domain-beta",
  },
];
