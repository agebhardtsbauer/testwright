import type { Page } from "@playwright/test";

/**
 * Default spinner selectors used across various applications
 */
const DEFAULT_SPINNER_SELECTORS = [
  '[data-testid="loading-spinner"]',
  '[data-testid="loading"]',
  ".loading-spinner",
  ".loading",
  '[aria-busy="true"]',
  ".spinner",
  '[role="progressbar"]',
  '[class*="spinner"]',
  '[class*="loading"]',
];

/**
 * Options for waiting operations
 */
export interface WaitOptions {
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Options for waiting for loading spinner
 */
export interface WaitForSpinnerOptions extends WaitOptions {
  /** Custom spinner selectors to check */
  spinnerSelectors?: string[];
}

/**
 * Options for waiting for element
 */
export interface WaitForElementOptions extends WaitOptions {
  /** State to wait for */
  state?: "visible" | "attached" | "hidden" | "detached";
}

/**
 * Options for waiting for network idle
 */
export interface WaitForNetworkIdleOptions extends WaitOptions {
  /** Maximum number of inflight requests allowed (default: 0) */
  maxInflight?: number;
}

/**
 * Wait for loading spinner to disappear
 *
 * Checks multiple common spinner selectors and waits for all
 * matching spinners to be hidden.
 *
 * @param page - Playwright Page object
 * @param options - Wait options
 *
 * @example
 * ```typescript
 * await waitForLoadingSpinner(page);
 * await waitForLoadingSpinner(page, {
 *   timeout: 30000,
 *   spinnerSelectors: ['[data-testid="custom-spinner"]']
 * });
 * ```
 */
export async function waitForLoadingSpinner(
  page: Page,
  options?: WaitForSpinnerOptions
): Promise<void> {
  const selectors = options?.spinnerSelectors ?? DEFAULT_SPINNER_SELECTORS;
  const timeout = options?.timeout ?? 30000;

  // Wait for any visible spinner to disappear
  for (const selector of selectors) {
    const spinner = page.locator(selector);
    const count = await spinner.count();

    if (count > 0) {
      // Wait for all instances to be hidden
      await spinner.first().waitFor({ state: "hidden", timeout });
    }
  }
}

/**
 * Wait for element to reach specified state
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param options - Wait options
 *
 * @example
 * ```typescript
 * await waitForElement(page, '[data-testid="submit-button"]');
 * await waitForElement(page, '.modal', { state: 'hidden' });
 * ```
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options?: WaitForElementOptions
): Promise<void> {
  const state = options?.state ?? "visible";
  const timeout = options?.timeout ?? 30000;

  await page.locator(selector).waitFor({ state, timeout });
}

/**
 * Wait for network to settle
 *
 * Waits until there are no more than maxInflight network requests
 * in progress.
 *
 * @param page - Playwright Page object
 * @param options - Wait options
 *
 * @example
 * ```typescript
 * await waitForNetworkIdle(page);
 * await waitForNetworkIdle(page, { maxInflight: 2, timeout: 10000 });
 * ```
 */
export async function waitForNetworkIdle(
  page: Page,
  options?: WaitForNetworkIdleOptions
): Promise<void> {
  const timeout = options?.timeout ?? 30000;

  // Use Playwright's built-in network idle waiting
  await page.waitForLoadState("networkidle", { timeout });
}

/**
 * Wait for SPA route transition to complete
 *
 * Watches for URL change and waits for network to settle.
 * Optionally validates the final URL matches expected pattern.
 *
 * @param page - Playwright Page object
 * @param expectedRoute - Optional URL pattern to validate
 * @param options - Wait options
 *
 * @example
 * ```typescript
 * await waitForRouteTransition(page);
 * await waitForRouteTransition(page, '/profile');
 * await waitForRouteTransition(page, /\/users\/\d+/);
 * ```
 */
export async function waitForRouteTransition(
  page: Page,
  expectedRoute?: string | RegExp,
  options?: WaitOptions
): Promise<void> {
  const timeout = options?.timeout ?? 30000;

  // Wait for network to settle after navigation
  await page.waitForLoadState("networkidle", { timeout });

  // If expected route provided, validate URL
  if (expectedRoute) {
    if (typeof expectedRoute === "string") {
      await page.waitForURL(`**${expectedRoute}*`, { timeout });
    } else {
      await page.waitForURL(expectedRoute, { timeout });
    }
  }
}

/**
 * Wait for multiple conditions simultaneously
 *
 * @param page - Playwright Page object
 * @param conditions - Array of async functions that return when condition is met
 * @param options - Wait options
 */
export async function waitForAll(
  page: Page,
  conditions: Array<() => Promise<void>>,
  options?: WaitOptions
): Promise<void> {
  const timeout = options?.timeout ?? 30000;

  await Promise.race([
    Promise.all(conditions.map((fn) => fn())),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("waitForAll timeout")), timeout)
    ),
  ]);
}

/**
 * Wait for page to be stable
 *
 * Waits for DOM to stop changing and network to settle.
 * Useful after complex interactions.
 *
 * @param page - Playwright Page object
 * @param options - Wait options
 */
export async function waitForStable(
  page: Page,
  options?: WaitOptions
): Promise<void> {
  const timeout = options?.timeout ?? 30000;

  await Promise.all([
    page.waitForLoadState("domcontentloaded", { timeout }),
    page.waitForLoadState("networkidle", { timeout }),
  ]);
}
