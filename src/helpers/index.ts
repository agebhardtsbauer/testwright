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
  type LoginOptions,
  type FormSelectors,
} from "./auth.js";

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
  type NavigationOptions,
  type SPANavigationOptions,
} from "./navigation.js";

// Waiting helpers
export {
  waitForLoadingSpinner,
  waitForElement,
  waitForNetworkIdle,
  waitForRouteTransition,
  waitForAll,
  waitForStable,
  type WaitOptions,
  type WaitForSpinnerOptions,
  type WaitForElementOptions,
  type WaitForNetworkIdleOptions,
} from "./waiting.js";

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
  type ClickOptions,
  type FillOptions,
  type SelectOptions,
} from "./interaction.js";

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
  type LinkVerificationOptions,
  type APIVerificationOptions,
} from "./verification.js";

// Test case helpers
export {
  testCase,
  reportTestCaseResult,
  TEST_CASE_ANNOTATION_TYPE,
} from "./testCase.js";
