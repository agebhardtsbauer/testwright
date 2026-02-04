import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateRunId,
  generateTestRunResult,
  getTestRunSummary,
  formatSummary,
  mergeTestRunResults,
  type CollectedResult,
} from "../../src/reporter/payloadGenerator";
import type { TestRunResult } from "../../src/types";

describe("payloadGenerator", () => {
  describe("generateRunId", () => {
    it("generates unique IDs", () => {
      const id1 = generateRunId();
      const id2 = generateRunId();
      expect(id1).not.toBe(id2);
    });

    it("follows expected format", () => {
      const id = generateRunId();
      // Format: run-YYYY-MM-DD-HHMM-xxxxxxxx
      expect(id).toMatch(/^run-\d{4}-\d{2}-\d{2}-\d{4}-[a-f0-9]{8}$/);
    });

    it("starts with 'run-'", () => {
      const id = generateRunId();
      expect(id.startsWith("run-")).toBe(true);
    });
  });

  describe("generateTestRunResult", () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("generates valid test run result", () => {
      const results = new Map<string, CollectedResult>([
        [
          "TC-1",
          {
            testCaseIds: ["TC-1"],
            status: "passed",
            duration: 1000,
            retries: 0,
            screenshots: [],
          },
        ],
      ]);

      const result = generateTestRunResult(results, null);

      expect(result.runId).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.testCaseId).toBe("TC-1");
      expect(result.results[0]?.status).toBe("passed");
    });

    it("includes error info for failed tests", () => {
      const results = new Map<string, CollectedResult>([
        [
          "TC-1",
          {
            testCaseIds: ["TC-1"],
            status: "failed",
            duration: 2000,
            error: "Expected 1 but got 2",
            stackTrace: "Error: Expected 1...\n  at test.ts:10",
            retries: 1,
            screenshots: ["/screenshots/failure.png"],
          },
        ],
      ]);

      const result = generateTestRunResult(results, null);

      expect(result.results[0]?.error).toBe("Expected 1 but got 2");
      expect(result.results[0]?.stackTrace).toContain("Error: Expected 1");
      expect(result.results[0]?.retries).toBe(1);
      expect(result.results[0]?.screenshots).toHaveLength(1);
    });

    it("uses TEST_ENV for environment", () => {
      vi.stubEnv("TEST_ENV", "staging");

      const results = new Map<string, CollectedResult>();
      const result = generateTestRunResult(results, null);

      expect(result.environment).toBe("staging");
    });

    it("uses TEST_DOMAIN for domain", () => {
      vi.stubEnv("TEST_DOMAIN", "domain-alpha");

      const results = new Map<string, CollectedResult>();
      const result = generateTestRunResult(results, null);

      expect(result.domain).toBe("domain-alpha");
    });

    it("defaults to 'unknown' for domain when not set", () => {
      const results = new Map<string, CollectedResult>();
      const result = generateTestRunResult(results, null);

      expect(result.domain).toBe("unknown");
    });

    it("omits optional fields when not present", () => {
      const results = new Map<string, CollectedResult>([
        [
          "TC-1",
          {
            testCaseIds: ["TC-1"],
            status: "passed",
            duration: 1000,
            retries: 0,
            screenshots: [],
          },
        ],
      ]);

      const result = generateTestRunResult(results, null);

      expect(result.results[0]).not.toHaveProperty("error");
      expect(result.results[0]).not.toHaveProperty("stackTrace");
      expect(result.results[0]).not.toHaveProperty("retries");
      expect(result.results[0]).not.toHaveProperty("screenshots");
    });
  });

  describe("getTestRunSummary", () => {
    it("calculates summary correctly", () => {
      const result: TestRunResult = {
        runId: "test-run",
        timestamp: new Date().toISOString(),
        environment: "dev",
        domain: "domain-alpha",
        app: "test-app",
        results: [
          { testCaseId: "TC-1", status: "passed", duration: 1000 },
          { testCaseId: "TC-2", status: "passed", duration: 2000 },
          { testCaseId: "TC-3", status: "failed", duration: 3000 },
          { testCaseId: "TC-4", status: "skipped", duration: 0 },
        ],
      };

      const summary = getTestRunSummary(result);

      expect(summary.total).toBe(4);
      expect(summary.passed).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.skipped).toBe(1);
      expect(summary.testCases).toEqual(["TC-1", "TC-2", "TC-3", "TC-4"]);
    });

    it("handles empty results", () => {
      const result: TestRunResult = {
        runId: "test-run",
        timestamp: new Date().toISOString(),
        environment: "dev",
        domain: "domain-alpha",
        app: "test-app",
        results: [],
      };

      const summary = getTestRunSummary(result);

      expect(summary.total).toBe(0);
      expect(summary.passed).toBe(0);
      expect(summary.failed).toBe(0);
      expect(summary.skipped).toBe(0);
      expect(summary.testCases).toEqual([]);
    });
  });

  describe("formatSummary", () => {
    it("formats summary for console output", () => {
      const summary = {
        total: 10,
        passed: 7,
        failed: 2,
        skipped: 1,
        testCases: ["TC-1", "TC-2"],
      };

      const formatted = formatSummary(summary);

      expect(formatted).toContain("Total: 10");
      expect(formatted).toContain("Passed: 7");
      expect(formatted).toContain("Failed: 2");
      expect(formatted).toContain("Skipped: 1");
    });
  });

  describe("mergeTestRunResults", () => {
    it("merges multiple run results", () => {
      const run1: TestRunResult = {
        runId: "run-1",
        timestamp: "2024-01-01T00:00:00Z",
        environment: "dev",
        domain: "domain-alpha",
        app: "test-app",
        results: [
          { testCaseId: "TC-1", status: "passed", duration: 1000 },
        ],
      };

      const run2: TestRunResult = {
        runId: "run-2",
        timestamp: "2024-01-01T00:01:00Z",
        environment: "dev",
        domain: "domain-alpha",
        app: "test-app",
        results: [
          { testCaseId: "TC-2", status: "passed", duration: 2000 },
        ],
      };

      const merged = mergeTestRunResults([run1, run2]);

      expect(merged.results).toHaveLength(2);
      expect(merged.runId).toBe("run-1");
    });

    it("keeps worst status for duplicate test case IDs", () => {
      const run1: TestRunResult = {
        runId: "run-1",
        timestamp: "2024-01-01T00:00:00Z",
        environment: "dev",
        domain: "domain-alpha",
        app: "test-app",
        results: [
          { testCaseId: "TC-1", status: "passed", duration: 1000 },
        ],
      };

      const run2: TestRunResult = {
        runId: "run-2",
        timestamp: "2024-01-01T00:01:00Z",
        environment: "dev",
        domain: "domain-alpha",
        app: "test-app",
        results: [
          { testCaseId: "TC-1", status: "failed", duration: 2000 },
        ],
      };

      const merged = mergeTestRunResults([run1, run2]);

      expect(merged.results).toHaveLength(1);
      expect(merged.results[0]?.status).toBe("failed");
    });

    it("handles empty array", () => {
      const merged = mergeTestRunResults([]);

      expect(merged.results).toHaveLength(0);
      expect(merged.environment).toBe("dev");
    });
  });
});
