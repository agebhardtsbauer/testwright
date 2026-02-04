import { test as playwrightBase } from "@playwright/test";
import { TEST_CASE_ANNOTATION_TYPE } from "../helpers/testCase.js";

/**
 * Function type for adding test case IDs
 */
export type TestCaseIdFn = (id: string | string[]) => void;

/**
 * Base fixtures that all testwright fixtures extend from
 */
export interface BaseFixtures {
  /**
   * Add test case ID(s) to the current test for reporting
   *
   * @example
   * ```typescript
   * test('user can login', async ({ page, testCaseId }) => {
   *   testCaseId('TC-1234');
   *   // or multiple IDs
   *   testCaseId(['TC-1234', 'TC-1235']);
   * });
   * ```
   */
  testCaseId: TestCaseIdFn;
}

/**
 * Base test fixture with testCaseId support
 *
 * All other testwright fixtures extend from this base.
 */
export const baseFixtures = playwrightBase.extend<BaseFixtures>({
  testCaseId: async ({}, use, testInfo) => {
    const addId: TestCaseIdFn = (id: string | string[]) => {
      const ids = Array.isArray(id) ? id : [id];
      for (const tcId of ids) {
        testInfo.annotations.push({
          type: TEST_CASE_ANNOTATION_TYPE,
          description: tcId,
        });
      }
    };
    await use(addId);
  },
});
