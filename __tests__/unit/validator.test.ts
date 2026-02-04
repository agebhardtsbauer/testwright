import { describe, it, expect } from "vitest";
import {
  validateTestCaseId,
  checkForDuplicates,
  validateTestCaseIds,
} from "../../src/reporter/validator";

describe("validator", () => {
  describe("validateTestCaseId", () => {
    it("validates TC-#### format by default", () => {
      expect(validateTestCaseId("TC-1")).toBe(true);
      expect(validateTestCaseId("TC-12")).toBe(true);
      expect(validateTestCaseId("TC-123")).toBe(true);
      expect(validateTestCaseId("TC-1234")).toBe(true);
      expect(validateTestCaseId("TC-12345")).toBe(true);
    });

    it("rejects invalid format with default pattern", () => {
      expect(validateTestCaseId("INVALID")).toBe(false);
      expect(validateTestCaseId("tc-1234")).toBe(false);
      expect(validateTestCaseId("TC1234")).toBe(false);
      expect(validateTestCaseId("TC-")).toBe(false);
      expect(validateTestCaseId("TC-abc")).toBe(false);
      expect(validateTestCaseId("")).toBe(false);
    });

    it("validates custom patterns", () => {
      expect(validateTestCaseId("TEST-ABC-123", "TEST-[A-Z]+-\\d+")).toBe(true);
      expect(validateTestCaseId("TEST-XYZ-999", "TEST-[A-Z]+-\\d+")).toBe(true);
      expect(validateTestCaseId("TEST-123", "TEST-[A-Z]+-\\d+")).toBe(false);
    });

    it("validates JIRA-style patterns", () => {
      const jiraPattern = "[A-Z]+-\\d+";
      expect(validateTestCaseId("PROJ-123", jiraPattern)).toBe(true);
      expect(validateTestCaseId("ABC-1", jiraPattern)).toBe(true);
      expect(validateTestCaseId("proj-123", jiraPattern)).toBe(false);
    });

    it("validates UUID patterns", () => {
      const uuidPattern =
        "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
      expect(
        validateTestCaseId(
          "123e4567-e89b-12d3-a456-426614174000",
          uuidPattern
        )
      ).toBe(true);
      expect(validateTestCaseId("not-a-uuid", uuidPattern)).toBe(false);
    });

    it("handles anchored patterns correctly", () => {
      // Pattern is wrapped with ^ and $, so partial matches fail
      expect(validateTestCaseId("TC-1234extra", "TC-\\d+")).toBe(false);
      expect(validateTestCaseId("prefixTC-1234", "TC-\\d+")).toBe(false);
    });
  });

  describe("checkForDuplicates", () => {
    it("returns empty array when no duplicates", () => {
      expect(checkForDuplicates(["TC-1", "TC-2", "TC-3"])).toEqual([]);
    });

    it("returns duplicate IDs", () => {
      const result = checkForDuplicates(["TC-1", "TC-2", "TC-1", "TC-3"]);
      expect(result).toEqual(["TC-1"]);
    });

    it("returns all duplicate IDs", () => {
      const result = checkForDuplicates([
        "TC-1",
        "TC-2",
        "TC-1",
        "TC-3",
        "TC-2",
      ]);
      expect(result.sort()).toEqual(["TC-1", "TC-2"]);
    });

    it("handles empty array", () => {
      expect(checkForDuplicates([])).toEqual([]);
    });

    it("handles single element", () => {
      expect(checkForDuplicates(["TC-1"])).toEqual([]);
    });

    it("returns each duplicate only once", () => {
      const result = checkForDuplicates([
        "TC-1",
        "TC-1",
        "TC-1",
        "TC-1",
      ]);
      expect(result).toEqual(["TC-1"]);
    });
  });

  describe("validateTestCaseIds", () => {
    it("returns valid for correct IDs", () => {
      const result = validateTestCaseIds(["TC-1", "TC-2", "TC-3"]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("returns errors for invalid format", () => {
      const result = validateTestCaseIds(["TC-1", "INVALID", "TC-3"]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("INVALID");
    });

    it("adds warnings for duplicates when allowed", () => {
      const result = validateTestCaseIds(["TC-1", "TC-1", "TC-2"], {
        allowDuplicates: true,
      });
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("TC-1");
    });

    it("adds errors for duplicates when not allowed", () => {
      const result = validateTestCaseIds(["TC-1", "TC-1", "TC-2"], {
        allowDuplicates: false,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate"))).toBe(true);
    });

    it("uses custom pattern", () => {
      const result = validateTestCaseIds(["TEST-ABC-1", "TEST-XYZ-2"], {
        pattern: "TEST-[A-Z]+-\\d+",
      });
      expect(result.valid).toBe(true);
    });

    it("combines multiple validation failures", () => {
      const result = validateTestCaseIds(
        ["INVALID", "TC-1", "TC-1", "BAD"],
        { allowDuplicates: false }
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it("handles empty array", () => {
      const result = validateTestCaseIds([]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
