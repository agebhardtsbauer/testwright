import type { Page, Locator, Response } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Options for link verification
 */
export interface LinkVerificationOptions {
  /** Locator or selector for the link */
  locator: Locator | string;
  /** Expected link text */
  text?: string;
  /** Expected href URL or pattern */
  url?: string | RegExp;
  /** Whether link should open in new tab */
  isNewTab?: boolean;
}

/**
 * Options for API response verification
 */
export interface APIVerificationOptions {
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Verify link properties
 *
 * Checks link text, URL, and target attribute.
 *
 * @param page - Playwright Page object
 * @param options - Link verification options
 *
 * @example
 * ```typescript
 * await verifyLink(page, {
 *   locator: 'a[data-testid="home-link"]',
 *   text: 'Home',
 *   url: '/home',
 *   isNewTab: false
 * });
 * ```
 */
export async function verifyLink(
  page: Page,
  options: LinkVerificationOptions
): Promise<void> {
  const locator =
    typeof options.locator === "string"
      ? page.locator(options.locator)
      : options.locator;

  // Verify text if provided
  if (options.text !== undefined) {
    await expect(locator).toHaveText(options.text);
  }

  // Verify URL if provided
  if (options.url !== undefined) {
    if (typeof options.url === "string") {
      await expect(locator).toHaveAttribute("href", options.url);
    } else {
      const href = await locator.getAttribute("href");
      expect(href).toMatch(options.url);
    }
  }

  // Verify target attribute for new tab
  if (options.isNewTab !== undefined) {
    if (options.isNewTab) {
      await expect(locator).toHaveAttribute("target", "_blank");
    } else {
      // Should not have target="_blank" or should have no target
      const target = await locator.getAttribute("target");
      expect(target === null || target !== "_blank").toBe(true);
    }
  }
}

/**
 * Verify element text content
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param expectedText - Expected text (string or regex)
 *
 * @example
 * ```typescript
 * await verifyText(page, '.welcome-message', 'Hello, World');
 * await verifyText(page, '.price', /\$\d+\.\d{2}/);
 * ```
 */
export async function verifyText(
  page: Page,
  selector: string,
  expectedText: string | RegExp
): Promise<void> {
  const locator = page.locator(selector);

  if (typeof expectedText === "string") {
    await expect(locator).toHaveText(expectedText);
  } else {
    await expect(locator).toHaveText(expectedText);
  }
}

/**
 * Verify element contains specific text
 *
 * Unlike verifyText, this checks if the element contains the text,
 * not that it matches exactly.
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param text - Text that should be contained
 */
export async function verifyContainsText(
  page: Page,
  selector: string,
  text: string | RegExp
): Promise<void> {
  const locator = page.locator(selector);
  await expect(locator).toContainText(text);
}

/**
 * Verify element visibility
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param shouldBeVisible - Whether element should be visible (default: true)
 *
 * @example
 * ```typescript
 * await verifyVisible(page, '.success-message');
 * await verifyVisible(page, '.error-dialog', false);
 * ```
 */
export async function verifyVisible(
  page: Page,
  selector: string,
  shouldBeVisible: boolean = true
): Promise<void> {
  const locator = page.locator(selector);

  if (shouldBeVisible) {
    await expect(locator).toBeVisible();
  } else {
    await expect(locator).not.toBeVisible();
  }
}

/**
 * Verify element is hidden
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 */
export async function verifyHidden(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeHidden();
}

/**
 * Verify element exists in DOM
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param shouldExist - Whether element should exist (default: true)
 */
export async function verifyExists(
  page: Page,
  selector: string,
  shouldExist: boolean = true
): Promise<void> {
  const locator = page.locator(selector);

  if (shouldExist) {
    await expect(locator).toBeAttached();
  } else {
    await expect(locator).not.toBeAttached();
  }
}

/**
 * Verify current URL
 *
 * @param page - Playwright Page object
 * @param expectedUrl - Expected URL (string or regex)
 *
 * @example
 * ```typescript
 * await verifyURL(page, 'https://example.com/profile');
 * await verifyURL(page, /\/profile$/);
 * ```
 */
export async function verifyURL(
  page: Page,
  expectedUrl: string | RegExp
): Promise<void> {
  await expect(page).toHaveURL(expectedUrl);
}

/**
 * Verify page title
 *
 * @param page - Playwright Page object
 * @param expectedTitle - Expected title (string or regex)
 */
export async function verifyTitle(
  page: Page,
  expectedTitle: string | RegExp
): Promise<void> {
  await expect(page).toHaveTitle(expectedTitle);
}

/**
 * Verify element attribute value
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param attribute - Attribute name
 * @param value - Expected value (string or regex)
 */
export async function verifyAttribute(
  page: Page,
  selector: string,
  attribute: string,
  value: string | RegExp
): Promise<void> {
  const locator = page.locator(selector);
  await expect(locator).toHaveAttribute(attribute, value);
}

/**
 * Verify element has specific CSS class
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param className - Expected class name
 */
export async function verifyHasClass(
  page: Page,
  selector: string,
  className: string
): Promise<void> {
  const locator = page.locator(selector);
  await expect(locator).toHaveClass(new RegExp(`(^|\\s)${className}($|\\s)`));
}

/**
 * Verify element CSS property
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param property - CSS property name
 * @param value - Expected value
 */
export async function verifyCSS(
  page: Page,
  selector: string,
  property: string,
  value: string
): Promise<void> {
  const locator = page.locator(selector);
  await expect(locator).toHaveCSS(property, value);
}

/**
 * Verify input value
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the input
 * @param expectedValue - Expected input value
 */
export async function verifyInputValue(
  page: Page,
  selector: string,
  expectedValue: string
): Promise<void> {
  const locator = page.locator(selector);
  await expect(locator).toHaveValue(expectedValue);
}

/**
 * Verify checkbox state
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the checkbox
 * @param shouldBeChecked - Whether checkbox should be checked (default: true)
 */
export async function verifyChecked(
  page: Page,
  selector: string,
  shouldBeChecked: boolean = true
): Promise<void> {
  const locator = page.locator(selector);

  if (shouldBeChecked) {
    await expect(locator).toBeChecked();
  } else {
    await expect(locator).not.toBeChecked();
  }
}

/**
 * Verify element is enabled
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param shouldBeEnabled - Whether element should be enabled (default: true)
 */
export async function verifyEnabled(
  page: Page,
  selector: string,
  shouldBeEnabled: boolean = true
): Promise<void> {
  const locator = page.locator(selector);

  if (shouldBeEnabled) {
    await expect(locator).toBeEnabled();
  } else {
    await expect(locator).toBeDisabled();
  }
}

/**
 * Verify element is disabled
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 */
export async function verifyDisabled(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeDisabled();
}

/**
 * Verify element count
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the elements
 * @param expectedCount - Expected number of elements
 */
export async function verifyCount(
  page: Page,
  selector: string,
  expectedCount: number
): Promise<void> {
  const locator = page.locator(selector);
  await expect(locator).toHaveCount(expectedCount);
}

/**
 * Verify API response
 *
 * Intercepts a network request and validates the response.
 *
 * @param page - Playwright Page object
 * @param urlPattern - URL pattern to match
 * @param validator - Function to validate the response
 * @param options - Verification options
 *
 * @example
 * ```typescript
 * await verifyAPIResponse(
 *   page,
 *   '/api/user',
 *   async (response) => {
 *     const data = await response.json();
 *     return data.status === 'success';
 *   }
 * );
 * ```
 */
export async function verifyAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  validator: (response: Response) => boolean | Promise<boolean>,
  options?: APIVerificationOptions
): Promise<void> {
  const timeout = options?.timeout ?? 30000;

  const response = await page.waitForResponse(
    (response) => {
      if (typeof urlPattern === "string") {
        return response.url().includes(urlPattern);
      }
      return urlPattern.test(response.url());
    },
    { timeout }
  );

  const isValid = await validator(response);
  expect(isValid).toBe(true);
}

/**
 * Verify no console errors
 *
 * Checks that no console errors occurred during page interactions.
 * Should be set up before the actions that might cause errors.
 *
 * @param page - Playwright Page object
 * @param action - Action to perform while monitoring console
 *
 * @example
 * ```typescript
 * await verifyNoConsoleErrors(page, async () => {
 *   await page.click('#submit');
 * });
 * ```
 */
export async function verifyNoConsoleErrors(
  page: Page,
  action: () => Promise<void>
): Promise<void> {
  const errors: string[] = [];

  const handler = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  };

  page.on("console", handler);

  try {
    await action();
  } finally {
    page.off("console", handler);
  }

  expect(errors).toHaveLength(0);
}

/**
 * Verify screenshot matches baseline
 *
 * Takes a screenshot and compares to baseline.
 * Creates baseline if it doesn't exist.
 *
 * @param page - Playwright Page object
 * @param name - Screenshot name
 * @param options - Screenshot options
 */
export async function verifyScreenshot(
  page: Page,
  name: string,
  options?: { fullPage?: boolean; maxDiffPixels?: number }
): Promise<void> {
  const screenshotOptions: {
    fullPage?: boolean;
    maxDiffPixels?: number;
  } = {};

  if (options?.fullPage !== undefined) {
    screenshotOptions.fullPage = options.fullPage;
  }
  if (options?.maxDiffPixels !== undefined) {
    screenshotOptions.maxDiffPixels = options.maxDiffPixels;
  }

  await expect(page).toHaveScreenshot(name, screenshotOptions);
}

/**
 * Verify element screenshot matches baseline
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param name - Screenshot name
 * @param options - Screenshot options
 */
export async function verifyElementScreenshot(
  page: Page,
  selector: string,
  name: string,
  options?: { maxDiffPixels?: number }
): Promise<void> {
  const locator = page.locator(selector);

  const screenshotOptions: { maxDiffPixels?: number } = {};
  if (options?.maxDiffPixels !== undefined) {
    screenshotOptions.maxDiffPixels = options.maxDiffPixels;
  }

  await expect(locator).toHaveScreenshot(name, screenshotOptions);
}
