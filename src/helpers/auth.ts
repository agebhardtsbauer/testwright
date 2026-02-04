import type { Page, BrowserContext } from "@playwright/test";
import type { AppConfig, TestUser, Environment } from "../types/index.js";
import {
  buildAppUrl,
  getTargetDomain,
  getTargetEnvironment,
} from "../utils/urlBuilder.js";
import {
  isSessionValid,
  saveSession,
  getSessionFilePath,
} from "../utils/sessionCache.js";
import { getUserPassword } from "../utils/userFilter.js";

/**
 * Default selectors for login form elements
 */
const DEFAULT_SELECTORS = {
  email: 'input[type="email"], input[name="email"], #email',
  password: 'input[type="password"], input[name="password"], #password',
  submitButton: 'button[type="submit"], input[type="submit"], [data-testid="login-submit"]',
};

/**
 * Options for login operations
 */
export interface LoginOptions {
  /** Target domain (uses TEST_DOMAIN env var if not specified) */
  domain?: string;
  /** Target environment (uses TEST_ENV env var if not specified) */
  environment?: Environment;
  /** Skip session cache and always perform login */
  skipSessionCache?: boolean;
  /** Custom login path (default: '/login') */
  loginPath?: string;
  /** Element to wait for after successful login */
  waitForSelector?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Custom selectors for login form elements */
  selectors?: {
    email?: string;
    password?: string;
    submitButton?: string;
  };
}

/**
 * Options for form filling
 */
export interface FormSelectors {
  /** Selector for email input */
  email?: string;
  /** Selector for password input */
  password?: string;
  /** Selector for submit button */
  submitButton?: string;
}

/**
 * Fill login form fields
 *
 * Fills email and password fields using provided or default selectors.
 *
 * @param page - Playwright Page object
 * @param email - Email address to fill
 * @param password - Password to fill
 * @param selectors - Custom selectors for form elements
 *
 * @example
 * ```typescript
 * await fillLoginForm(page, 'user@example.com', 'password123');
 * await fillLoginForm(page, email, password, {
 *   email: '#custom-email',
 *   password: '#custom-password'
 * });
 * ```
 */
export async function fillLoginForm(
  page: Page,
  email: string,
  password: string,
  selectors?: FormSelectors
): Promise<void> {
  const emailSelector = selectors?.email ?? DEFAULT_SELECTORS.email;
  const passwordSelector = selectors?.password ?? DEFAULT_SELECTORS.password;

  // Fill email field
  const emailInput = page.locator(emailSelector);
  await emailInput.waitFor({ state: "visible", timeout: 10000 });
  await emailInput.fill(email);

  // Fill password field
  const passwordInput = page.locator(passwordSelector);
  await passwordInput.waitFor({ state: "visible", timeout: 10000 });
  await passwordInput.fill(password);
}

/**
 * Submit login form and wait for navigation
 *
 * Clicks the submit button and waits for page navigation to complete.
 *
 * @param page - Playwright Page object
 * @param selectors - Custom selectors for form elements
 *
 * @example
 * ```typescript
 * await submitLoginForm(page);
 * await submitLoginForm(page, { submitButton: '#login-btn' });
 * ```
 */
export async function submitLoginForm(
  page: Page,
  selectors?: FormSelectors
): Promise<void> {
  const submitSelector = selectors?.submitButton ?? DEFAULT_SELECTORS.submitButton;

  const submitButton = page.locator(submitSelector);
  await submitButton.waitFor({ state: "visible", timeout: 10000 });

  // Click and wait for navigation
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 }),
    submitButton.click(),
  ]);
}

/**
 * Execute full login flow for an app
 *
 * Navigates to login page, fills credentials, submits form,
 * and optionally caches the session.
 *
 * @param page - Playwright Page object
 * @param app - Application configuration
 * @param user - Test user to log in as
 * @param options - Login options
 * @returns The authenticated Page object
 *
 * @example
 * ```typescript
 * // Basic usage
 * await loginToApp(page, appConfig, testUser);
 *
 * // With options
 * await loginToApp(page, appConfig, testUser, {
 *   domain: 'domain-alpha',
 *   environment: 'staging',
 *   skipSessionCache: true
 * });
 * ```
 */
export async function loginToApp(
  page: Page,
  app: AppConfig,
  user: TestUser,
  options?: LoginOptions
): Promise<Page> {
  const domain = options?.domain ?? getTargetDomain(app);
  const environment = options?.environment ?? getTargetEnvironment();
  const loginPath = options?.loginPath ?? "/login";
  const timeout = options?.timeout ?? 30000;
  const skipSessionCache = options?.skipSessionCache ?? false;
  const waitForSelector = options?.waitForSelector;
  const selectors = options?.selectors;

  // Check for cached session
  if (!skipSessionCache) {
    const hasValidSession = await isSessionValid(user.id, domain, environment);
    if (hasValidSession) {
      // Load session from cache
      const sessionPath = getSessionFilePath(user.id, domain, environment);
      const context = page.context();
      await context.storageState({ path: sessionPath });

      // Navigate to app
      const appUrl = buildAppUrl(app, domain, environment);
      await page.goto(appUrl, { timeout, waitUntil: "networkidle" });

      if (waitForSelector) {
        await page.locator(waitForSelector).waitFor({ state: "visible", timeout });
      }

      return page;
    }
  }

  // Build login URL
  const baseUrl = buildAppUrl(app, domain, environment);
  const loginUrl = new URL(loginPath, baseUrl).toString();

  // Navigate to login page
  await page.goto(loginUrl, { timeout, waitUntil: "networkidle" });

  // Get password
  const password = getUserPassword(user);

  // Fill and submit login form
  await fillLoginForm(page, user.email, password, selectors);
  await submitLoginForm(page, selectors);

  // Wait for post-login element if specified
  if (waitForSelector) {
    await page.locator(waitForSelector).waitFor({ state: "visible", timeout });
  }

  // Save session to cache
  if (!skipSessionCache) {
    const context = page.context();
    const storageState = await context.storageState();
    await saveSession(user, domain, environment, storageState);
  }

  return page;
}

/**
 * Start a new session with cached authentication
 *
 * Creates a new page in the context and either loads cached session
 * or performs login if no valid cache exists.
 *
 * @param context - Browser context
 * @param app - Application configuration
 * @param user - Test user to authenticate as
 * @param options - Login options
 * @returns New page with authenticated session
 *
 * @example
 * ```typescript
 * const page = await startAuthenticatedSession(context, appConfig, testUser);
 * ```
 */
export async function startAuthenticatedSession(
  context: BrowserContext,
  app: AppConfig,
  user: TestUser,
  options?: LoginOptions
): Promise<Page> {
  const domain = options?.domain ?? getTargetDomain(app);
  const environment = options?.environment ?? getTargetEnvironment();
  const skipSessionCache = options?.skipSessionCache ?? false;

  // Check for cached session
  if (!skipSessionCache) {
    const hasValidSession = await isSessionValid(user.id, domain, environment);
    if (hasValidSession) {
      // Create new context with cached storage state
      const sessionPath = getSessionFilePath(user.id, domain, environment);

      // Read storage state and apply to context
      const { readFile } = await import("fs/promises");
      const sessionContent = await readFile(sessionPath, "utf-8");
      const sessionData = JSON.parse(sessionContent) as {
        storageState: {
          cookies: Array<{
            name: string;
            value: string;
            domain: string;
            path: string;
            expires?: number;
            httpOnly?: boolean;
            secure?: boolean;
            sameSite?: "Strict" | "Lax" | "None";
          }>;
          origins: Array<{
            origin: string;
            localStorage: Array<{
              name: string;
              value: string;
            }>;
          }>;
        };
      };

      // Add cookies to context
      if (sessionData.storageState.cookies) {
        await context.addCookies(sessionData.storageState.cookies);
      }

      // Create page and navigate
      const page = await context.newPage();
      const appUrl = buildAppUrl(app, domain, environment);
      await page.goto(appUrl, { waitUntil: "networkidle" });

      return page;
    }
  }

  // No valid session, perform login
  const page = await context.newPage();
  return loginToApp(page, app, user, options);
}

/**
 * Logout from current session
 *
 * @param page - Playwright Page object
 * @param logoutPath - Path to logout endpoint (default: '/logout')
 *
 * @example
 * ```typescript
 * await logout(page);
 * await logout(page, '/api/auth/logout');
 * ```
 */
export async function logout(
  page: Page,
  logoutPath: string = "/logout"
): Promise<void> {
  const currentUrl = new URL(page.url());
  const logoutUrl = new URL(logoutPath, currentUrl.origin).toString();

  await page.goto(logoutUrl, { waitUntil: "networkidle" });
}

/**
 * Check if user is currently authenticated
 *
 * Performs a basic check by looking for common authentication indicators.
 *
 * @param page - Playwright Page object
 * @param options - Check options
 * @returns True if user appears to be authenticated
 */
export async function isAuthenticated(
  page: Page,
  options?: {
    /** Selector that indicates user is logged in */
    authenticatedSelector?: string;
    /** Selector that indicates user is logged out */
    unauthenticatedSelector?: string;
  }
): Promise<boolean> {
  const authenticatedSelector =
    options?.authenticatedSelector ??
    '[data-testid="user-menu"], [data-testid="logout"], .user-profile';
  const unauthenticatedSelector =
    options?.unauthenticatedSelector ??
    '[data-testid="login"], [data-testid="sign-in"], .login-button';

  // Check for authenticated indicator
  const authenticatedElement = page.locator(authenticatedSelector);
  const isAuthVisible = await authenticatedElement.isVisible().catch(() => false);

  if (isAuthVisible) {
    return true;
  }

  // Check for unauthenticated indicator
  const unauthenticatedElement = page.locator(unauthenticatedSelector);
  const isUnauthVisible = await unauthenticatedElement.isVisible().catch(() => false);

  return !isUnauthVisible;
}

/**
 * Wait for authentication to complete
 *
 * Waits for authentication-related network requests to finish.
 *
 * @param page - Playwright Page object
 * @param options - Wait options
 */
export async function waitForAuth(
  page: Page,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;

  await page.waitForLoadState("networkidle", { timeout });
}

/**
 * Refresh authentication
 *
 * Clears existing session and performs fresh login.
 *
 * @param page - Playwright Page object
 * @param app - Application configuration
 * @param user - Test user
 * @param options - Login options
 */
export async function refreshAuth(
  page: Page,
  app: AppConfig,
  user: TestUser,
  options?: LoginOptions
): Promise<Page> {
  const { clearSession } = await import("../utils/sessionCache.js");

  const domain = options?.domain ?? getTargetDomain(app);
  const environment = options?.environment ?? getTargetEnvironment();

  // Clear existing session
  await clearSession(user.id, domain, environment);

  // Perform fresh login
  return loginToApp(page, app, user, {
    ...options,
    skipSessionCache: true,
  });
}
