import type { Environment } from "./app.js";

/**
 * Test case metadata for associating tests with test management system
 */
export interface TestCaseMetadata {
  /** Single test case ID or array of IDs that this test satisfies */
  testCaseId: string | string[];
  /** Optional additional context about the test */
  description?: string;
  /** Test priority level */
  priority?: "P0" | "P1" | "P2" | "P3";
  /** Additional categorization tags */
  tags?: string[];
}

/**
 * Result for a single test case in a test run
 */
export interface TestCaseResult {
  /** Test case ID from the test management system */
  testCaseId: string;
  /** Test execution status */
  status: "passed" | "failed" | "skipped";
  /** Test duration in milliseconds */
  duration: number;
  /** Error message if the test failed */
  error?: string;
  /** Stack trace if the test failed */
  stackTrace?: string;
  /** Number of retries attempted */
  retries?: number;
  /** Paths to failure screenshots */
  screenshots?: string[];
}

/**
 * Complete test run result payload
 *
 * Generated at the end of each test run, containing results
 * for all test cases executed.
 */
export interface TestRunResult {
  /** Unique test run identifier */
  runId: string;
  /** ISO 8601 timestamp of when the run completed */
  timestamp: string;
  /** Target environment for this test run */
  environment: Environment;
  /** Target domain for this test run */
  domain: string;
  /** Application slug being tested */
  app: string;
  /** Results for each test case */
  results: TestCaseResult[];
}

/**
 * Summary of a test run
 */
export interface TestRunSummary {
  /** Total number of test cases */
  total: number;
  /** Number of passed test cases */
  passed: number;
  /** Number of failed test cases */
  failed: number;
  /** Number of skipped test cases */
  skipped: number;
  /** List of all test case IDs in this run */
  testCases: string[];
}
