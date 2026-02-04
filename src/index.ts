/**
 * Testwright - Reusable Playwright testing infrastructure
 *
 * TODO: Update package name before publishing
 * This module provides standardized Playwright testing infrastructure
 * for multi-domain SPA applications.
 *
 * @example
 * ```typescript
 * import { buildAppUrl, type AppConfig, type TestUser } from 'testwright';
 *
 * const appConfig: AppConfig = {
 *   slug: 'member-landing',
 *   type: 'spa',
 *   requiresAuth: true,
 *   domains: [
 *     {
 *       domain: 'domain-alpha',
 *       environments: [
 *         { environment: 'dev', baseUrl: 'https://www-dev.domain-alpha.com' },
 *       ],
 *     },
 *   ],
 * };
 *
 * const url = buildAppUrl(appConfig, 'domain-alpha', 'dev');
 * // => "https://www-dev.domain-alpha.com/s/member-landing"
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Type Exports
// ============================================================================

// App and environment types
export type {
  Environment,
  AppType,
  EnvironmentConfig,
  DomainDeployment,
  AppConfig,
} from "./types/app.js";

// User types
export type { UserType, TestUser } from "./types/user.js";

// Test case tracking types
export type {
  TestCaseMetadata,
  TestCaseResult,
  TestRunResult,
  TestRunSummary,
} from "./types/testCase.js";

// Configuration types
export type {
  SessionCache,
  SessionOptions,
  ReporterOptions,
  TestwrightConfig,
} from "./types/config.js";

// ============================================================================
// Utility Exports
// ============================================================================

// URL building utilities
export {
  buildAppUrl,
  buildAppUrlFromEnv,
  getAppTypePrefix,
  getTargetDomain,
  getTargetEnvironment,
} from "./utils/urlBuilder.js";

// User filtering utilities
export {
  getUsersByTags,
  getUsersByType,
  getUserById,
  getFirstUser,
  getUserPassword,
} from "./utils/userFilter.js";

// Session cache utilities
export {
  getSessionFilePath,
  isSessionValid,
  getSessionPath,
  getStorageState,
  saveSession,
  clearSession,
  clearSessionCache,
  getSessionMetadata,
  listSessions,
  clearExpiredSessions,
} from "./utils/sessionCache.js";

// ============================================================================
// Config Exports
// ============================================================================

export { defaultConfig, devConfig } from "./config/playwright.config.js";

// ============================================================================
// Helper Exports
// ============================================================================

// Authentication helpers
export {
  fillLoginForm,
  submitLoginForm,
  loginToApp,
  startAuthenticatedSession,
  logout,
  isAuthenticated,
  waitForAuth,
  refreshAuth,
} from "./helpers/auth.js";

// Navigation helpers
export {
  navigateToApp,
  navigateToRoute,
  navigateToAbsoluteRoute,
  navigateAndWaitForSPA,
  getCurrentAppBaseUrl,
  waitForNavigation,
  reloadPage,
  goBack,
  goForward,
} from "./helpers/navigation.js";

// Waiting helpers
export {
  waitForLoadingSpinner,
  waitForElement,
  waitForNetworkIdle,
  waitForRouteTransition,
  waitForAll,
  waitForStable,
} from "./helpers/waiting.js";

// Interaction helpers
export {
  clickElement,
  doubleClickElement,
  rightClickElement,
  fillInput,
  typeText,
  selectDropdownOption,
  selectMultipleOptions,
  uploadFile,
  clearFileInput,
  checkCheckbox,
  uncheckCheckbox,
  setCheckbox,
  hoverElement,
  focusElement,
  scrollIntoView,
  pressKey,
  dragAndDrop,
} from "./helpers/interaction.js";

// Verification helpers
export {
  verifyLink,
  verifyText,
  verifyContainsText,
  verifyVisible,
  verifyHidden,
  verifyExists,
  verifyURL,
  verifyTitle,
  verifyAttribute,
  verifyHasClass,
  verifyCSS,
  verifyInputValue,
  verifyChecked,
  verifyEnabled,
  verifyDisabled,
  verifyCount,
  verifyAPIResponse,
  verifyNoConsoleErrors,
  verifyScreenshot,
  verifyElementScreenshot,
} from "./helpers/verification.js";

// Test case helpers
export {
  testCase,
  reportTestCaseResult,
  TEST_CASE_ANNOTATION_TYPE,
} from "./helpers/testCase.js";

// Helper types
export type {
  LoginOptions,
  FormSelectors,
} from "./helpers/auth.js";

export type {
  NavigationOptions,
  SPANavigationOptions,
} from "./helpers/navigation.js";

export type {
  WaitOptions,
  WaitForSpinnerOptions,
  WaitForElementOptions,
  WaitForNetworkIdleOptions,
} from "./helpers/waiting.js";

export type {
  ClickOptions,
  FillOptions,
  SelectOptions,
} from "./helpers/interaction.js";

export type {
  LinkVerificationOptions,
  APIVerificationOptions,
} from "./helpers/verification.js";

// ============================================================================
// Reporter Exports
// ============================================================================

// Reporter validation utilities (also available from testwright/reporter)
export {
  validateTestCaseId,
  checkForDuplicates,
  checkForMissingIds,
  validateTestCaseIds,
} from "./reporter/validator.js";

export type { ValidationResult } from "./reporter/validator.js";
