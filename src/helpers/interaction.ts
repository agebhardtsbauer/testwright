import type { Page } from "@playwright/test";

/**
 * Options for click operations
 */
export interface ClickOptions {
  /** Force click even if element is not visible */
  force?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Wait for navigation after click */
  waitForNavigation?: boolean;
  /** Modifier keys to hold during click */
  modifiers?: Array<"Alt" | "Control" | "Meta" | "Shift">;
  /** Position within element to click */
  position?: { x: number; y: number };
}

/**
 * Options for fill operations
 */
export interface FillOptions {
  /** Clear existing content before filling (default: true) */
  clear?: boolean;
  /** Blur the input after filling */
  blur?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Type character by character (slower but more realistic) */
  typeCharacterByCharacter?: boolean;
}

/**
 * Options for select operations
 */
export interface SelectOptions {
  /** Select by label text instead of value */
  byLabel?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Click element with automatic retry and visibility wait
 *
 * Waits for the element to be visible and actionable before clicking.
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param options - Click options
 *
 * @example
 * ```typescript
 * await clickElement(page, '[data-testid="submit-button"]');
 * await clickElement(page, '.menu-item', { waitForNavigation: true });
 * ```
 */
export async function clickElement(
  page: Page,
  selector: string,
  options?: ClickOptions
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const force = options?.force ?? false;
  const waitForNavigation = options?.waitForNavigation ?? false;
  const modifiers = options?.modifiers;
  const position = options?.position;

  const locator = page.locator(selector);

  // Build click options
  const clickOptions: Parameters<typeof locator.click>[0] = {
    timeout,
    force,
    ...(modifiers ? { modifiers } : {}),
    ...(position ? { position } : {}),
  };

  if (waitForNavigation) {
    await Promise.all([
      page.waitForNavigation({ timeout }),
      locator.click(clickOptions),
    ]);
  } else {
    await locator.click(clickOptions);
  }
}

/**
 * Double-click element
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param options - Click options
 */
export async function doubleClickElement(
  page: Page,
  selector: string,
  options?: Omit<ClickOptions, "waitForNavigation">
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const force = options?.force ?? false;
  const modifiers = options?.modifiers;
  const position = options?.position;

  await page.locator(selector).dblclick({
    timeout,
    force,
    ...(modifiers ? { modifiers } : {}),
    ...(position ? { position } : {}),
  });
}

/**
 * Right-click element
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param options - Click options
 */
export async function rightClickElement(
  page: Page,
  selector: string,
  options?: Omit<ClickOptions, "waitForNavigation">
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const force = options?.force ?? false;
  const modifiers = options?.modifiers;
  const position = options?.position;

  await page.locator(selector).click({
    button: "right",
    timeout,
    force,
    ...(modifiers ? { modifiers } : {}),
    ...(position ? { position } : {}),
  });
}

/**
 * Fill input field with automatic focus and clear
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the input
 * @param value - Value to fill
 * @param options - Fill options
 *
 * @example
 * ```typescript
 * await fillInput(page, '#email', 'test@example.com');
 * await fillInput(page, '#search', 'query', { blur: true });
 * ```
 */
export async function fillInput(
  page: Page,
  selector: string,
  value: string,
  options?: FillOptions
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const clear = options?.clear ?? true;
  const blur = options?.blur ?? false;
  const typeCharacterByCharacter = options?.typeCharacterByCharacter ?? false;

  const locator = page.locator(selector);

  // Clear existing content if requested
  if (clear) {
    await locator.clear({ timeout });
  }

  // Fill or type based on option
  if (typeCharacterByCharacter) {
    await locator.pressSequentially(value, { timeout });
  } else {
    await locator.fill(value, { timeout });
  }

  // Blur if requested
  if (blur) {
    await locator.blur({ timeout });
  }
}

/**
 * Type text character by character
 *
 * Slower but more realistic typing simulation.
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the input
 * @param text - Text to type
 * @param options - Fill options
 */
export async function typeText(
  page: Page,
  selector: string,
  text: string,
  options?: { delay?: number; timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const delay = options?.delay ?? 50;

  await page.locator(selector).pressSequentially(text, { delay, timeout });
}

/**
 * Select dropdown option by value or label
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the select element
 * @param optionValue - Value or label to select
 * @param options - Select options
 *
 * @example
 * ```typescript
 * await selectDropdownOption(page, '#country', 'US');
 * await selectDropdownOption(page, '#country', 'United States', { byLabel: true });
 * ```
 */
export async function selectDropdownOption(
  page: Page,
  selector: string,
  optionValue: string,
  options?: SelectOptions
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const byLabel = options?.byLabel ?? false;

  const locator = page.locator(selector);

  if (byLabel) {
    await locator.selectOption({ label: optionValue }, { timeout });
  } else {
    await locator.selectOption(optionValue, { timeout });
  }
}

/**
 * Select multiple options in a multi-select
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the select element
 * @param values - Array of values to select
 * @param options - Select options
 */
export async function selectMultipleOptions(
  page: Page,
  selector: string,
  values: string[],
  options?: SelectOptions
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const byLabel = options?.byLabel ?? false;

  const locator = page.locator(selector);

  if (byLabel) {
    await locator.selectOption(
      values.map((label) => ({ label })),
      { timeout }
    );
  } else {
    await locator.selectOption(values, { timeout });
  }
}

/**
 * Upload file to input element
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the file input
 * @param filePath - Path to file(s) to upload
 *
 * @example
 * ```typescript
 * await uploadFile(page, 'input[type="file"]', './test-data/image.png');
 * await uploadFile(page, '#documents', ['./doc1.pdf', './doc2.pdf']);
 * ```
 */
export async function uploadFile(
  page: Page,
  selector: string,
  filePath: string | string[]
): Promise<void> {
  await page.locator(selector).setInputFiles(filePath);
}

/**
 * Clear file input
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the file input
 */
export async function clearFileInput(
  page: Page,
  selector: string
): Promise<void> {
  await page.locator(selector).setInputFiles([]);
}

/**
 * Check a checkbox
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the checkbox
 * @param options - Options
 */
export async function checkCheckbox(
  page: Page,
  selector: string,
  options?: { force?: boolean; timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const force = options?.force ?? false;

  await page.locator(selector).check({ timeout, force });
}

/**
 * Uncheck a checkbox
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the checkbox
 * @param options - Options
 */
export async function uncheckCheckbox(
  page: Page,
  selector: string,
  options?: { force?: boolean; timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const force = options?.force ?? false;

  await page.locator(selector).uncheck({ timeout, force });
}

/**
 * Set checkbox to specific state
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the checkbox
 * @param checked - Whether to check or uncheck
 * @param options - Options
 */
export async function setCheckbox(
  page: Page,
  selector: string,
  checked: boolean,
  options?: { force?: boolean; timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const force = options?.force ?? false;

  await page.locator(selector).setChecked(checked, { timeout, force });
}

/**
 * Hover over element
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param options - Options
 */
export async function hoverElement(
  page: Page,
  selector: string,
  options?: { force?: boolean; timeout?: number; position?: { x: number; y: number } }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const force = options?.force ?? false;
  const position = options?.position;

  await page.locator(selector).hover({
    timeout,
    force,
    ...(position ? { position } : {}),
  });
}

/**
 * Focus on element
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param options - Options
 */
export async function focusElement(
  page: Page,
  selector: string,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;

  await page.locator(selector).focus({ timeout });
}

/**
 * Scroll element into view
 *
 * @param page - Playwright Page object
 * @param selector - CSS selector for the element
 * @param options - Options
 */
export async function scrollIntoView(
  page: Page,
  selector: string,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;

  await page.locator(selector).scrollIntoViewIfNeeded({ timeout });
}

/**
 * Press keyboard key
 *
 * @param page - Playwright Page object
 * @param key - Key to press (e.g., 'Enter', 'Tab', 'Escape')
 */
export async function pressKey(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
}

/**
 * Drag element to another element
 *
 * @param page - Playwright Page object
 * @param sourceSelector - CSS selector for source element
 * @param targetSelector - CSS selector for target element
 * @param options - Options
 */
export async function dragAndDrop(
  page: Page,
  sourceSelector: string,
  targetSelector: string,
  options?: { force?: boolean; timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 30000;
  const force = options?.force ?? false;

  await page.locator(sourceSelector).dragTo(page.locator(targetSelector), {
    timeout,
    force,
  });
}
