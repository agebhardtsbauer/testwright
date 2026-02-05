import { test as base, type TestInfo, type Page, type BrowserContext, type Browser, type APIRequestContext } from "@playwright/test";

/**
 * Annotation type for test case IDs
 *
 * This is used internally by the reporter to identify test cases.
 */
export const TEST_CASE_ANNOTATION_TYPE = "testCaseId";

/**
 * Common fixtures passed to test functions
 */
interface CommonFixtures {
  page: Page;
  context: BrowserContext;
  browser: Browser;
  request: APIRequestContext;
  browserName: string;
}

/**
 * Type for test function with fixtures
 */
type TestFunction = (
  args: CommonFixtures,
  testInfo: TestInfo
) => Promise<void> | void;

/**
 * Create a test with required test case ID(s)
 *
 * This wrapper function enforces that every test has an associated
 * test case ID from the test management system. The reporter uses
 * these IDs to generate result payloads.
 *
 * @param testCaseId - Single test case ID or array of IDs
 * @param title - Test title
 * @param testFn - Test function
 *
 * @example
 * ```typescript
 * // Single test case ID
 * testCase('TC-1234', 'member can view profile', async ({ page }) => {
 *   await page.goto('/profile');
 *   await expect(page.getByRole('heading')).toHaveText('Profile');
 * });
 *
 * // Multiple test case IDs (one test satisfies multiple cases)
 * testCase(['TC-1234', 'TC-1235'], 'profile shows all fields', async ({ page }) => {
 *   await expect(page.getByText('Email')).toBeVisible();
 *   await expect(page.getByText('Name')).toBeVisible();
 * });
 * ```
 */
export function testCase(
  testCaseId: string | string[],
  title: string,
  testFn: TestFunction
): void {
  // Normalize to array
  const ids = Array.isArray(testCaseId) ? testCaseId : [testCaseId];

  // Build annotations for test registration
  const annotations = ids.map((id) => ({
    type: TEST_CASE_ANNOTATION_TYPE,
    description: id,
  }));

  // Create test with annotations passed at registration time
  // This makes them available in onBegin for the reporter
  base(
    title,
    { annotation: annotations },
    async ({ page, context, browser, request, browserName }, testInfo) => {
      await testFn({ page, context, browser, request, browserName }, testInfo);
    }
  );
}

/**
 * Create a test.only with test case ID
 *
 * @param testCaseId - Single test case ID or array of IDs
 * @param title - Test title
 * @param testFn - Test function
 */
testCase.only = function (
  testCaseId: string | string[],
  title: string,
  testFn: TestFunction
): void {
  const ids = Array.isArray(testCaseId) ? testCaseId : [testCaseId];
  const annotations = ids.map((id) => ({
    type: TEST_CASE_ANNOTATION_TYPE,
    description: id,
  }));

  base.only(
    title,
    { annotation: annotations },
    async ({ page, context, browser, request, browserName }, testInfo) => {
      await testFn({ page, context, browser, request, browserName }, testInfo);
    }
  );
};

/**
 * Create a skipped test with test case ID
 *
 * @param testCaseId - Single test case ID or array of IDs
 * @param title - Test title
 * @param testFn - Test function
 */
testCase.skip = function (
  testCaseId: string | string[],
  title: string,
  testFn: TestFunction
): void {
  const ids = Array.isArray(testCaseId) ? testCaseId : [testCaseId];
  const annotations = ids.map((id) => ({
    type: TEST_CASE_ANNOTATION_TYPE,
    description: id,
  }));

  base.skip(
    title,
    { annotation: annotations },
    async ({ page, context, browser, request, browserName }, testInfo) => {
      await testFn({ page, context, browser, request, browserName }, testInfo);
    }
  );
};

/**
 * Create a fixme test with test case ID
 *
 * @param testCaseId - Single test case ID or array of IDs
 * @param title - Test title
 * @param testFn - Test function
 */
testCase.fixme = function (
  testCaseId: string | string[],
  title: string,
  testFn: TestFunction
): void {
  const ids = Array.isArray(testCaseId) ? testCaseId : [testCaseId];
  const annotations = ids.map((id) => ({
    type: TEST_CASE_ANNOTATION_TYPE,
    description: id,
  }));

  base.fixme(
    title,
    { annotation: annotations },
    async ({ page, context, browser, request, browserName }, testInfo) => {
      await testFn({ page, context, browser, request, browserName }, testInfo);
    }
  );
};

/**
 * Report a test case result manually
 *
 * Useful for reporting results from non-Playwright tests or
 * for manual result injection.
 *
 * Note: This function is meant to be used with the reporter's
 * result collection mechanism.
 *
 * @param testCaseId - Test case ID
 * @param result - Result object
 */
export function reportTestCaseResult(
  testCaseId: string,
  result: {
    status: "passed" | "failed" | "skipped";
    duration?: number;
    error?: string;
  }
): void {
  // This is a placeholder that can be enhanced to write to a shared
  // results file that the reporter picks up
  console.log(
    `[testCase] ${testCaseId}: ${result.status}${
      result.duration ? ` (${result.duration}ms)` : ""
    }`
  );
}
