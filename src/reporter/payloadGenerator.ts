import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import type { FullConfig } from "@playwright/test/reporter";
import type {
  TestCaseResult,
  TestRunResult,
  TestRunSummary,
  Environment,
} from "../types/index.js";
import { getTargetEnvironment } from "../utils/urlBuilder.js";

/**
 * Collected result from a single test
 */
export interface CollectedResult {
  /** Test case IDs associated with this test */
  testCaseIds: string[];
  /** Test status */
  status: TestCaseResult["status"];
  /** Test duration in milliseconds */
  duration: number;
  /** Error message if failed */
  error?: string;
  /** Stack trace if failed */
  stackTrace?: string;
  /** Number of retries attempted */
  retries: number;
  /** Paths to screenshots */
  screenshots: string[];
}

/**
 * Generate a unique test run ID
 *
 * Format: run-YYYY-MM-DD-HHMM-xxxxxxxx
 *
 * @returns Unique run ID
 */
export function generateRunId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString().slice(11, 16).replace(":", "");
  const uuid = randomUUID().slice(0, 8);
  return `run-${dateStr}-${timeStr}-${uuid}`;
}

/**
 * Build TestRunResult from collected results
 *
 * @param results - Map of test case ID to collected result
 * @param config - Playwright configuration (optional)
 * @returns Complete test run result payload
 */
export function generateTestRunResult(
  results: Map<string, CollectedResult>,
  config: FullConfig | null
): TestRunResult {
  const testCaseResults: TestCaseResult[] = [];

  for (const [testCaseId, result] of results) {
    const caseResult: TestCaseResult = {
      testCaseId,
      status: result.status,
      duration: result.duration,
    };

    // Add optional fields only if they have values
    if (result.error) {
      caseResult.error = result.error;
    }
    if (result.stackTrace) {
      caseResult.stackTrace = result.stackTrace;
    }
    if (result.retries > 0) {
      caseResult.retries = result.retries;
    }
    if (result.screenshots.length > 0) {
      caseResult.screenshots = result.screenshots;
    }

    testCaseResults.push(caseResult);
  }

  // Get environment info from env vars
  const environment: Environment = getTargetEnvironment();
  const domain = process.env["TEST_DOMAIN"] ?? "unknown";
  const app =
    process.env["TEST_APP"] ?? config?.projects[0]?.name ?? "unknown";

  return {
    runId: generateRunId(),
    timestamp: new Date().toISOString(),
    environment,
    domain,
    app,
    results: testCaseResults,
  };
}

/**
 * Write test results to JSON file
 *
 * Creates parent directories if they don't exist.
 *
 * @param results - Test run result payload
 * @param outputPath - Path to write JSON file
 */
export async function writeResultsToFile(
  results: TestRunResult,
  outputPath: string
): Promise<void> {
  // Ensure directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  // Write with pretty formatting
  await writeFile(outputPath, JSON.stringify(results, null, 2), "utf-8");
}

/**
 * Get summary statistics for a test run
 *
 * @param results - Test run result payload
 * @returns Summary statistics
 */
export function getTestRunSummary(results: TestRunResult): TestRunSummary {
  return {
    total: results.results.length,
    passed: results.results.filter((r) => r.status === "passed").length,
    failed: results.results.filter((r) => r.status === "failed").length,
    skipped: results.results.filter((r) => r.status === "skipped").length,
    testCases: results.results.map((r) => r.testCaseId),
  };
}

/**
 * Format summary for console output
 *
 * @param summary - Test run summary
 * @returns Formatted string for console
 */
export function formatSummary(summary: TestRunSummary): string {
  const lines = [
    `Total: ${summary.total}`,
    `Passed: ${summary.passed}`,
    `Failed: ${summary.failed}`,
    `Skipped: ${summary.skipped}`,
  ];
  return lines.join(" | ");
}

/**
 * Merge results from multiple test runs
 *
 * Useful for combining results from parallel shards.
 *
 * @param runs - Array of test run results
 * @returns Merged test run result
 */
export function mergeTestRunResults(runs: TestRunResult[]): TestRunResult {
  if (runs.length === 0) {
    return {
      runId: generateRunId(),
      timestamp: new Date().toISOString(),
      environment: "dev",
      domain: "unknown",
      app: "unknown",
      results: [],
    };
  }

  // Use first run's metadata
  const first = runs[0]!;
  const allResults: TestCaseResult[] = [];

  for (const run of runs) {
    allResults.push(...run.results);
  }

  // Deduplicate by test case ID (keep worst status)
  const resultMap = new Map<string, TestCaseResult>();
  for (const result of allResults) {
    const existing = resultMap.get(result.testCaseId);
    if (!existing) {
      resultMap.set(result.testCaseId, result);
    } else {
      // Keep the worst status (failed > skipped > passed)
      const statusPriority = { failed: 0, skipped: 1, passed: 2 };
      if (statusPriority[result.status] < statusPriority[existing.status]) {
        resultMap.set(result.testCaseId, result);
      }
    }
  }

  return {
    runId: first.runId,
    timestamp: first.timestamp,
    environment: first.environment,
    domain: first.domain,
    app: first.app,
    results: Array.from(resultMap.values()),
  };
}
