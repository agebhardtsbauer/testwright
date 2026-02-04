import type { Page } from "@playwright/test";
import type { AppConfig, Environment } from "../types/index.js";
import {
  buildAppUrl,
  getTargetDomain,
  getTargetEnvironment,
} from "../utils/urlBuilder.js";

/**
 * Options for navigation
 */
export interface NavigationOptions {
  /** Target domain (uses TEST_DOMAIN env var or first domain if not specified) */
  domain?: string;
  /** Target environment (uses TEST_ENV env var or 'dev' if not specified) */
  environment?: Environment;
  /** Wait for network to settle after navigation */
  waitForNetworkIdle?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Options for SPA navigation
 */
export interface SPANavigationOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Selector to wait for after navigation */
  waitForSelector?: string;
  /** Wait for network to settle */
  waitForNetworkIdle?: boolean;
}

/**
 * Navigate to the configured app's base URL
 *
 * Builds the full URL using the app config and navigates to it.
 * Uses environment variables TEST_DOMAIN and TEST_ENV if options not provided.
 *
 * @param page - Playwright Page object
 * @param app - Application configuration
 * @param options - Navigation options
 *
 * @example
 * ```typescript
 * // Navigate using env vars
 * await navigateToApp(page, appConfig);
 *
 * // Navigate to specific domain/environment
 * await navigateToApp(page, appConfig, {
 *   domain: 'domain-alpha',
 *   environment: 'staging'
 * });
 * ```
 */
export async function navigateToApp(
  page: Page,
  app: AppConfig,
  options?: NavigationOptions
): Promise<void> {
  const domain = options?.domain ?? getTargetDomain(app);
  const environment = options?.environment ?? getTargetEnvironment();
  const timeout = options?.timeout ?? 30000;
  const waitForNetworkIdle = options?.waitForNetworkIdle ?? true;

  const url = buildAppUrl(app, domain, environment);

  await page.goto(url, {
    timeout,
    waitUntil: waitForNetworkIdle ? "networkidle" : "domcontentloaded",
  });
}

/**
 * Navigate to a route within the current app
 *
 * Appends the route to the current base URL. The route should be
 * relative to the app's root.
 *
 * @param page - Playwright Page object
 * @param route - Route path (e.g., '/profile', '/settings')
 * @param options - Navigation options
 *
 * @example
 * ```typescript
 * // If current URL is https://www-dev.domain-alpha.com/s/member-landing
 * await navigateToRoute(page, '/profile');
 * // Navigates to: https://www-dev.domain-alpha.com/s/member-landing/profile
 * ```
 */
export async function navigateToRoute(
  page: Page,
  route: string,
  options?: Omit<NavigationOptions, "domain" | "environment">
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const waitForNetworkIdle = options?.waitForNetworkIdle ?? true;

  // Get current URL and append route
  const currentUrl = new URL(page.url());
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  const basePath = currentUrl.pathname.replace(/\/$/, "");
  currentUrl.pathname = `${basePath}${normalizedRoute}`;

  await page.goto(currentUrl.toString(), {
    timeout,
    waitUntil: waitForNetworkIdle ? "networkidle" : "domcontentloaded",
  });
}

/**
 * Navigate to an absolute route on the current domain
 *
 * Navigates to the specified path while keeping the current domain.
 * Use this for navigating between different apps on the same domain.
 *
 * @param page - Playwright Page object
 * @param route - Absolute route path (e.g., '/s/contacts', '/x/about')
 * @param options - Navigation options
 *
 * @example
 * ```typescript
 * // From https://www-dev.domain-alpha.com/s/member-landing
 * await navigateToAbsoluteRoute(page, '/s/contacts');
 * // Navigates to: https://www-dev.domain-alpha.com/s/contacts
 * ```
 */
export async function navigateToAbsoluteRoute(
  page: Page,
  route: string,
  options?: Omit<NavigationOptions, "domain" | "environment">
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const waitForNetworkIdle = options?.waitForNetworkIdle ?? true;

  const currentUrl = new URL(page.url());
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  currentUrl.pathname = normalizedRoute;

  await page.goto(currentUrl.toString(), {
    timeout,
    waitUntil: waitForNetworkIdle ? "networkidle" : "domcontentloaded",
  });
}

/**
 * Navigate to URL and wait for SPA to be ready
 *
 * Performs navigation and waits for SPA-specific ready signals
 * like network idle and optional selector presence.
 *
 * @param page - Playwright Page object
 * @param url - Full URL to navigate to
 * @param options - SPA navigation options
 *
 * @example
 * ```typescript
 * await navigateAndWaitForSPA(page, 'https://example.com/app', {
 *   waitForSelector: '[data-testid="app-ready"]',
 *   waitForNetworkIdle: true
 * });
 * ```
 */
export async function navigateAndWaitForSPA(
  page: Page,
  url: string,
  options?: SPANavigationOptions
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const waitForNetworkIdle = options?.waitForNetworkIdle ?? true;
  const waitForSelector = options?.waitForSelector;

  // Navigate to URL
  await page.goto(url, {
    timeout,
    waitUntil: "domcontentloaded",
  });

  // Wait for network if requested
  if (waitForNetworkIdle) {
    await page.waitForLoadState("networkidle", { timeout });
  }

  // Wait for specific selector if provided
  if (waitForSelector) {
    await page.locator(waitForSelector).waitFor({
      state: "visible",
      timeout,
    });
  }
}

/**
 * Get the current app base URL from page
 *
 * Extracts the base URL (up to and including the app slug) from
 * the current page URL.
 *
 * @param page - Playwright Page object
 * @returns Base URL or null if not on an app page
 */
export function getCurrentAppBaseUrl(page: Page): string | null {
  const url = new URL(page.url());
  const pathParts = url.pathname.split("/");

  // Find the app type prefix (/s/ or /x/)
  const prefixIndex = pathParts.findIndex((p) => p === "s" || p === "x");
  if (prefixIndex === -1 || prefixIndex >= pathParts.length - 1) {
    return null;
  }

  // Include up to the app slug
  const baseParts = pathParts.slice(0, prefixIndex + 2);
  url.pathname = baseParts.join("/");
  url.search = "";
  url.hash = "";

  return url.toString();
}

/**
 * Wait for navigation to complete
 *
 * Useful when waiting for programmatic navigation triggered
 * by user actions or JavaScript.
 *
 * @param page - Playwright Page object
 * @param urlPattern - Optional URL pattern to wait for
 * @param options - Wait options
 */
export async function waitForNavigation(
  page: Page,
  urlPattern?: string | RegExp,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;

  if (urlPattern) {
    await page.waitForURL(urlPattern, { timeout });
  } else {
    await page.waitForLoadState("networkidle", { timeout });
  }
}

/**
 * Reload the current page
 *
 * @param page - Playwright Page object
 * @param options - Navigation options
 */
export async function reloadPage(
  page: Page,
  options?: { timeout?: number; waitForNetworkIdle?: boolean }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const waitForNetworkIdle = options?.waitForNetworkIdle ?? true;

  await page.reload({
    timeout,
    waitUntil: waitForNetworkIdle ? "networkidle" : "domcontentloaded",
  });
}

/**
 * Go back in browser history
 *
 * @param page - Playwright Page object
 * @param options - Navigation options
 */
export async function goBack(
  page: Page,
  options?: { timeout?: number; waitForNetworkIdle?: boolean }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const waitForNetworkIdle = options?.waitForNetworkIdle ?? true;

  await page.goBack({
    timeout,
    waitUntil: waitForNetworkIdle ? "networkidle" : "domcontentloaded",
  });
}

/**
 * Go forward in browser history
 *
 * @param page - Playwright Page object
 * @param options - Navigation options
 */
export async function goForward(
  page: Page,
  options?: { timeout?: number; waitForNetworkIdle?: boolean }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const waitForNetworkIdle = options?.waitForNetworkIdle ?? true;

  await page.goForward({
    timeout,
    waitUntil: waitForNetworkIdle ? "networkidle" : "domcontentloaded",
  });
}
