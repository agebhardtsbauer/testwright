import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
import type { ReporterOptions, TestRunResult } from "../types/index.js";
import {
  generateTestRunResult,
  writeResultsToFile,
  getTestRunSummary,
  formatSummary,
  type CollectedResult,
} from "./payloadGenerator.js";
import {
  validateTestCaseId,
  checkForDuplicates,
  checkForMissingIds,
} from "./validator.js";
import { TEST_CASE_ANNOTATION_TYPE } from "../helpers/testCase.js";

export type { ReporterOptions } from "../types/index.js";
export {
  generateRunId,
  generateTestRunResult,
  writeResultsToFile,
  getTestRunSummary,
  formatSummary,
  mergeTestRunResults,
  type CollectedResult,
} from "./payloadGenerator.js";
export {
  validateTestCaseId,
  checkForDuplicates,
  checkForMissingIds,
  validateTestCaseIds,
  type ValidationResult,
} from "./validator.js";

/**
 * Default reporter options
 */
const DEFAULT_OPTIONS: Required<ReporterOptions> = {
  outputFile: "./test-results/test-case-results.json",
  apiEndpoint: "",
  apiKey: "",
  strictMode: false,
  allowDuplicates: true,
  testCaseIdPattern: "TC-\\d+",
};

/**
 * Custom Playwright reporter for test case tracking
 *
 * This reporter extracts test case IDs from test annotations and
 * generates a JSON payload with results at the end of each test run.
 *
 * @example
 * ```typescript
 * // playwright.config.ts
 * export default defineConfig({
 *   reporter: [
 *     ['testwright/reporter', {
 *       outputFile: './results/test-cases.json',
 *       strictMode: true,
 *       allowDuplicates: false
 *     }]
 *   ]
 * });
 * ```
 */
class TestCaseReporter implements Reporter {
  private options: Required<ReporterOptions>;
  private config: FullConfig | null = null;
  private results: Map<string, CollectedResult> = new Map();
  private allTestCaseIds: string[] = [];
  private testsWithoutIds: TestCase[] = [];

  constructor(options: ReporterOptions = {}) {
    this.options = {
      outputFile: options.outputFile ?? DEFAULT_OPTIONS.outputFile,
      apiEndpoint: options.apiEndpoint ?? DEFAULT_OPTIONS.apiEndpoint,
      apiKey: options.apiKey ?? DEFAULT_OPTIONS.apiKey,
      strictMode: options.strictMode ?? DEFAULT_OPTIONS.strictMode,
      allowDuplicates: options.allowDuplicates ?? DEFAULT_OPTIONS.allowDuplicates,
      testCaseIdPattern:
        options.testCaseIdPattern ?? DEFAULT_OPTIONS.testCaseIdPattern,
    };
  }

  /**
   * Called when test run starts
   */
  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    const allTests = suite.allTests();

    // Check for tests missing test case IDs
    this.testsWithoutIds = checkForMissingIds(
      allTests,
      TEST_CASE_ANNOTATION_TYPE
    );

    if (this.testsWithoutIds.length > 0) {
      const message = `[TestCaseReporter] ${this.testsWithoutIds.length} test(s) missing testCaseId`;

      if (this.options.strictMode) {
        console.error(message);
        this.testsWithoutIds.forEach((t) => {
          console.error(`  - ${t.titlePath().join(" > ")}`);
        });
      } else {
        console.warn(message);
      }
    }
  }

  /**
   * Called after each test completes
   */
  onTestEnd(test: TestCase, result: TestResult): void {
    // Extract test case IDs from annotations
    const testCaseIds = test.annotations
      .filter((a) => a.type === TEST_CASE_ANNOTATION_TYPE)
      .map((a) => a.description)
      .filter((id): id is string => id !== undefined);

    if (testCaseIds.length === 0) {
      if (this.options.strictMode) {
        console.warn(
          `[TestCaseReporter] Test missing testCaseId: ${test.title}`
        );
      }
      return;
    }

    // Validate test case ID format
    for (const id of testCaseIds) {
      if (!validateTestCaseId(id, this.options.testCaseIdPattern)) {
        console.warn(
          `[TestCaseReporter] Invalid testCaseId format: "${id}" (expected: ${this.options.testCaseIdPattern})`
        );
      }
    }

    // Map Playwright status to our status
    const status =
      result.status === "passed"
        ? "passed"
        : result.status === "skipped"
          ? "skipped"
          : "failed";

    // Extract screenshots from attachments
    const screenshots = result.attachments
      .filter((a) => a.contentType.startsWith("image/"))
      .map((a) => a.path)
      .filter((p): p is string => p !== undefined);

    // Store result for each test case ID
    for (const id of testCaseIds) {
      const existing = this.results.get(id);

      // Track for duplicate checking
      this.allTestCaseIds.push(id);

      // Check for duplicates
      if (existing && !this.options.allowDuplicates) {
        console.warn(`[TestCaseReporter] Duplicate testCaseId: ${id}`);
      }

      // If duplicate, keep the worst result (failed > skipped > passed)
      if (existing) {
        const statusPriority = { failed: 0, skipped: 1, passed: 2 };
        if (
          statusPriority[status as keyof typeof statusPriority] >=
          statusPriority[existing.status as keyof typeof statusPriority]
        ) {
          continue; // Keep existing worse result
        }
      }

      const collectedResult: CollectedResult = {
        testCaseIds: [id],
        status,
        duration: result.duration,
        retries: result.retry,
        screenshots,
      };

      // Add error info if present
      if (result.error) {
        if (result.error.message) {
          collectedResult.error = result.error.message;
        }
        if (result.error.stack) {
          collectedResult.stackTrace = result.error.stack;
        }
      }

      this.results.set(id, collectedResult);
    }
  }

  /**
   * Called when test run finishes
   */
  async onEnd(result: FullResult): Promise<void> {
    // Check for duplicates
    if (!this.options.allowDuplicates) {
      const duplicates = checkForDuplicates(this.allTestCaseIds);
      if (duplicates.length > 0) {
        console.error(
          `[TestCaseReporter] Duplicate test case IDs found: ${duplicates.join(", ")}`
        );
      }
    }

    // Generate payload
    const testRunResult = generateTestRunResult(this.results, this.config);

    // Log summary
    const summary = getTestRunSummary(testRunResult);
    console.log(`[TestCaseReporter] ${formatSummary(summary)}`);

    // Write to file
    await writeResultsToFile(testRunResult, this.options.outputFile);
    console.log(
      `[TestCaseReporter] Results written to ${this.options.outputFile}`
    );

    // POST to API if configured
    if (this.options.apiEndpoint) {
      await this.postResults(testRunResult);
    }

    // Fail if strict mode and tests are missing IDs
    if (this.options.strictMode && this.testsWithoutIds.length > 0) {
      console.error(
        `[TestCaseReporter] Strict mode: failing due to ${this.testsWithoutIds.length} test(s) missing testCaseId`
      );
    }
  }

  /**
   * POST results to API endpoint
   */
  private async postResults(results: TestRunResult): Promise<void> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.options.apiKey) {
        headers["Authorization"] = `Bearer ${this.options.apiKey}`;
      }

      const response = await fetch(this.options.apiEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(results),
      });

      if (!response.ok) {
        console.error(
          `[TestCaseReporter] Failed to POST results: ${response.status} ${response.statusText}`
        );
      } else {
        console.log(
          `[TestCaseReporter] Results POSTed to ${this.options.apiEndpoint}`
        );
      }
    } catch (error) {
      console.error(`[TestCaseReporter] Error POSTing results:`, error);
    }
  }

  /**
   * Whether this reporter prints to stdout
   */
  printsToStdio(): boolean {
    return true;
  }
}

// Default export for Playwright reporter configuration
export default TestCaseReporter;
export { TestCaseReporter };
