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
 * Default selectors for two-step login form elements (third-party auth)
 */
const DEFAULT_SELECTORS = {
  // Step 1: Email entry
  email: '//input[@id="username"]',
  continueButton: '//button[@type="submit"][text()="Continue"]',
  // Step 2: Password entry
  password: '//input[@id="password"]',
  loginButton: '//button[@type="submit"][text()="Login"]',
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
  /** Custom login path (default: navigates to app base URL) */
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
 * Options for two-step login form elements
 */
export interface FormSelectors {
  /** Selector for email/username input (step 1) */
  email?: string;
  /** Selector for continue button (step 1) */
  continueButton?: string;
  /** Selector for password input (step 2) */
  password?: string;
  /** Selector for login button (step 2) */
  loginButton?: string;
}

/**
 * Fill two-step login form (third-party auth flow)
 *
 * Handles the two-step login process:
 * 1. Enter email and click Continue
 * 2. Wait for password page, enter password
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
 *   email: '//input[@id="email"]',
 *   continueButton: '//button[text()="Next"]',
 *   password: '//input[@id="pass"]',
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
  const continueButtonSelector = selectors?.continueButton ?? DEFAULT_SELECTORS.continueButton;
  const passwordSelector = selectors?.password ?? DEFAULT_SELECTORS.password;

  // Step 1: Fill email field
  const emailInput = page.locator(emailSelector);
  await emailInput.waitFor({ state: "visible", timeout: 10000 });
  await emailInput.fill(email);

  // Click Continue button
  const continueButton = page.locator(continueButtonSelector);
  await continueButton.waitFor({ state: "visible", timeout: 10000 });
  await continueButton.click();

  // Step 2: Wait for password page and fill password
  const passwordInput = page.locator(passwordSelector);
  await passwordInput.waitFor({ state: "visible", timeout: 10000 });
  await passwordInput.fill(password);
}

/**
 * Submit login form and wait for navigation
 *
 * Clicks the Login button and waits for page navigation to complete.
 * This is step 2 of the two-step login process (after password entry).
 *
 * @param page - Playwright Page object
 * @param selectors - Custom selectors for form elements
 *
 * @example
 * ```typescript
 * await submitLoginForm(page);
 * await submitLoginForm(page, { loginButton: '//button[text()="Sign In"]' });
 * ```
 */
export async function submitLoginForm(
  page: Page,
  selectors?: FormSelectors
): Promise<void> {
  const loginButtonSelector = selectors?.loginButton ?? DEFAULT_SELECTORS.loginButton;

  const loginButton = page.locator(loginButtonSelector);
  await loginButton.waitFor({ state: "visible", timeout: 10000 });

  // Click and wait for navigation
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 }),
    loginButton.click(),
  ]);
}

/**
 * Execute full login flow for an app (third-party auth)
 *
 * Handles the two-step third-party authentication flow:
 * 1. Navigate to app URL (redirects to auth provider)
 * 2. Enter email and click Continue
 * 3. Enter password and click Login
 * 4. Wait for redirect back to app
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
  const loginPath = options?.loginPath;
  const timeout = options?.timeout ?? 30000;
  const skipSessionCache = options?.skipSessionCache ?? false;
  const waitForSelector = options?.waitForSelector;
  const selectors = options?.selectors;

  // Build app URL (this is where we want to end up after login)
  const appUrl = buildAppUrl(app, domain, environment);

  // Check for cached session
  if (!skipSessionCache) {
    const hasValidSession = await isSessionValid(user.id, domain, environment);
    if (hasValidSession) {
      // Load session from cache
      const sessionPath = getSessionFilePath(user.id, domain, environment);
      const context = page.context();
      await context.storageState({ path: sessionPath });

      // Navigate to app
      await page.goto(appUrl, { timeout, waitUntil: "networkidle" });

      if (waitForSelector) {
        await page.locator(waitForSelector).waitFor({ state: "visible", timeout });
      }

      return page;
    }
  }

  // Navigate to app URL (will redirect to third-party auth if not authenticated)
  // Or use custom loginPath if specified (e.g., direct auth URL)
  const startUrl = loginPath ? new URL(loginPath, appUrl).toString() : appUrl;
  await page.goto(startUrl, { timeout, waitUntil: "networkidle" });

  // Get password
  const password = getUserPassword(user);

  // Fill two-step login form (email -> continue -> password)
  await fillLoginForm(page, user.email, password, selectors);

  // Submit login and wait for redirect back to app
  await submitLoginForm(page, selectors);

  // Verify we landed on the app URL after login
  await page.waitForURL(new RegExp(app.slug), { timeout });

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
