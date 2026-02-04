import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getUsersByTags,
  getUsersByType,
  getUserById,
  getFirstUser,
  getUserPassword,
} from "../../src/utils/userFilter";
import type { TestUser } from "../../src/types";

const testUsers: TestUser[] = [
  {
    id: "member-1-dev-alpha",
    email: "member1@test.com",
    firstName: "Test",
    lastName: "Member",
    type: "member",
    tags: ["isActive", "hasSubscription", "hasPaymentMethod"],
    environment: "dev",
    domain: "domain-alpha",
  },
  {
    id: "member-2-dev-alpha",
    email: "member2@test.com",
    type: "member",
    tags: ["isActive"],
    environment: "dev",
    domain: "domain-alpha",
  },
  {
    id: "practitioner-1-dev-alpha",
    email: "practitioner1@test.com",
    password: "custom-password",
    type: "practitioner",
    tags: ["isActive", "canPrescribe"],
    environment: "dev",
    domain: "domain-alpha",
  },
  {
    id: "admin-1-dev-alpha",
    email: "admin1@test.com",
    type: "admin",
    tags: ["isActive", "canManageUsers"],
    environment: "dev",
    domain: "domain-alpha",
  },
  {
    id: "member-1-staging-alpha",
    email: "member1-staging@test.com",
    type: "member",
    tags: ["isActive", "hasSubscription"],
    environment: "staging",
    domain: "domain-alpha",
  },
  {
    id: "member-1-dev-beta",
    email: "member1-beta@test.com",
    type: "member",
    tags: ["isActive", "hasSubscription"],
    environment: "dev",
    domain: "domain-beta",
  },
];

describe("userFilter", () => {
  describe("getUsersByTags", () => {
    it("filters by single tag", () => {
      const users = getUsersByTags(
        testUsers,
        ["isActive"],
        "dev",
        "domain-alpha"
      );
      expect(users).toHaveLength(4);
    });

    it("filters by multiple tags (AND logic)", () => {
      const users = getUsersByTags(
        testUsers,
        ["isActive", "hasSubscription"],
        "dev",
        "domain-alpha"
      );
      expect(users).toHaveLength(1);
      expect(users[0]?.id).toBe("member-1-dev-alpha");
    });

    it("filters by all three criteria", () => {
      const users = getUsersByTags(
        testUsers,
        ["isActive", "hasSubscription", "hasPaymentMethod"],
        "dev",
        "domain-alpha"
      );
      expect(users).toHaveLength(1);
      expect(users[0]?.id).toBe("member-1-dev-alpha");
    });

    it("returns empty array when no match", () => {
      const users = getUsersByTags(
        testUsers,
        ["nonexistentTag"],
        "dev",
        "domain-alpha"
      );
      expect(users).toHaveLength(0);
    });

    it("filters by environment", () => {
      const devUsers = getUsersByTags(
        testUsers,
        ["isActive"],
        "dev",
        "domain-alpha"
      );
      const stagingUsers = getUsersByTags(
        testUsers,
        ["isActive"],
        "staging",
        "domain-alpha"
      );
      expect(devUsers).toHaveLength(4);
      expect(stagingUsers).toHaveLength(1);
    });

    it("filters by domain", () => {
      const alphaUsers = getUsersByTags(
        testUsers,
        ["hasSubscription"],
        "dev",
        "domain-alpha"
      );
      const betaUsers = getUsersByTags(
        testUsers,
        ["hasSubscription"],
        "dev",
        "domain-beta"
      );
      expect(alphaUsers).toHaveLength(1);
      expect(betaUsers).toHaveLength(1);
      expect(alphaUsers[0]?.id).toBe("member-1-dev-alpha");
      expect(betaUsers[0]?.id).toBe("member-1-dev-beta");
    });

    it("returns empty for wrong domain/environment combination", () => {
      const users = getUsersByTags(
        testUsers,
        ["isActive"],
        "prod",
        "domain-alpha"
      );
      expect(users).toHaveLength(0);
    });
  });

  describe("getUsersByType", () => {
    it("filters by member type", () => {
      const users = getUsersByType(testUsers, "member", "dev", "domain-alpha");
      expect(users).toHaveLength(2);
      expect(users.every((u) => u.type === "member")).toBe(true);
    });

    it("filters by practitioner type", () => {
      const users = getUsersByType(
        testUsers,
        "practitioner",
        "dev",
        "domain-alpha"
      );
      expect(users).toHaveLength(1);
      expect(users[0]?.id).toBe("practitioner-1-dev-alpha");
    });

    it("filters by admin type", () => {
      const users = getUsersByType(testUsers, "admin", "dev", "domain-alpha");
      expect(users).toHaveLength(1);
      expect(users[0]?.id).toBe("admin-1-dev-alpha");
    });

    it("returns empty for non-existent type", () => {
      const users = getUsersByType(testUsers, "client", "dev", "domain-alpha");
      expect(users).toHaveLength(0);
    });

    it("filters by environment", () => {
      const devUsers = getUsersByType(testUsers, "member", "dev", "domain-alpha");
      const stagingUsers = getUsersByType(
        testUsers,
        "member",
        "staging",
        "domain-alpha"
      );
      expect(devUsers).toHaveLength(2);
      expect(stagingUsers).toHaveLength(1);
    });

    it("filters by domain", () => {
      const alphaUsers = getUsersByType(
        testUsers,
        "member",
        "dev",
        "domain-alpha"
      );
      const betaUsers = getUsersByType(
        testUsers,
        "member",
        "dev",
        "domain-beta"
      );
      expect(alphaUsers).toHaveLength(2);
      expect(betaUsers).toHaveLength(1);
    });
  });

  describe("getUserById", () => {
    it("finds user by ID", () => {
      const user = getUserById(testUsers, "member-1-dev-alpha");
      expect(user).toBeDefined();
      expect(user?.email).toBe("member1@test.com");
    });

    it("returns undefined for non-existent ID", () => {
      const user = getUserById(testUsers, "non-existent-id");
      expect(user).toBeUndefined();
    });

    it("finds users from different domains", () => {
      const alphaUser = getUserById(testUsers, "member-1-dev-alpha");
      const betaUser = getUserById(testUsers, "member-1-dev-beta");
      expect(alphaUser?.domain).toBe("domain-alpha");
      expect(betaUser?.domain).toBe("domain-beta");
    });
  });

  describe("getFirstUser", () => {
    it("returns first user matching environment and domain", () => {
      const user = getFirstUser(testUsers, "dev", "domain-alpha");
      expect(user).toBeDefined();
      expect(user?.environment).toBe("dev");
      expect(user?.domain).toBe("domain-alpha");
    });

    it("returns undefined when no match", () => {
      const user = getFirstUser(testUsers, "prod", "domain-gamma");
      expect(user).toBeUndefined();
    });

    it("returns first user from staging", () => {
      const user = getFirstUser(testUsers, "staging", "domain-alpha");
      expect(user).toBeDefined();
      expect(user?.id).toBe("member-1-staging-alpha");
    });
  });

  describe("getUserPassword", () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns user-specific password when set", () => {
      const user = testUsers.find((u) => u.id === "practitioner-1-dev-alpha")!;
      expect(getUserPassword(user)).toBe("custom-password");
    });

    it("returns DEFAULT_TEST_PASSWORD when user has no password", () => {
      vi.stubEnv("DEFAULT_TEST_PASSWORD", "default-password");
      const user = testUsers.find((u) => u.id === "member-1-dev-alpha")!;
      expect(getUserPassword(user)).toBe("default-password");
    });

    it("returns empty string when no password and no env var", () => {
      const user = testUsers.find((u) => u.id === "member-1-dev-alpha")!;
      expect(getUserPassword(user)).toBe("");
    });

    it("prefers user password over env var", () => {
      vi.stubEnv("DEFAULT_TEST_PASSWORD", "default-password");
      const user = testUsers.find((u) => u.id === "practitioner-1-dev-alpha")!;
      expect(getUserPassword(user)).toBe("custom-password");
    });
  });
});
