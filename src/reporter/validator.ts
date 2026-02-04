import type { TestCase } from "@playwright/test/reporter";

/**
 * Validate test case ID format
 *
 * Checks if a test case ID matches the expected pattern.
 *
 * @param id - Test case ID to validate
 * @param pattern - Regex pattern (default: TC-\d+)
 * @returns True if valid
 *
 * @example
 * ```typescript
 * validateTestCaseId('TC-1234'); // true
 * validateTestCaseId('INVALID'); // false
 * validateTestCaseId('TEST-ABC-123', 'TEST-[A-Z]+-\\d+'); // true
 * ```
 */
export function validateTestCaseId(
  id: string,
  pattern: string = "TC-\\d+"
): boolean {
  const regex = new RegExp(`^${pattern}$`);
  return regex.test(id);
}

/**
 * Find tests missing test case IDs
 *
 * Scans test cases for those without testCaseId annotations.
 *
 * @param tests - Array of test cases to check
 * @param annotationType - Annotation type to look for
 * @returns Array of tests missing the annotation
 */
export function checkForMissingIds(
  tests: TestCase[],
  annotationType: string
): TestCase[] {
  return tests.filter((test) => {
    const hasTestCaseId = test.annotations.some(
      (a) => a.type === annotationType && a.description
    );
    return !hasTestCaseId;
  });
}

/**
 * Find duplicate test case IDs
 *
 * @param ids - Array of test case IDs
 * @returns Array of duplicate IDs (each appears once)
 */
export function checkForDuplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    } else {
      seen.add(id);
    }
  }

  return Array.from(duplicates);
}

/**
 * Validation result with details
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Error messages if validation failed */
  errors: string[];
  /** Warning messages */
  warnings: string[];
}

/**
 * Perform comprehensive validation on test case IDs
 *
 * @param ids - Array of test case IDs
 * @param options - Validation options
 * @returns Validation result
 */
export function validateTestCaseIds(
  ids: string[],
  options?: {
    pattern?: string;
    allowDuplicates?: boolean;
  }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const pattern = options?.pattern ?? "TC-\\d+";
  const allowDuplicates = options?.allowDuplicates ?? true;

  // Check format
  for (const id of ids) {
    if (!validateTestCaseId(id, pattern)) {
      errors.push(`Invalid test case ID format: "${id}" (expected pattern: ${pattern})`);
    }
  }

  // Check duplicates
  const duplicates = checkForDuplicates(ids);
  if (duplicates.length > 0) {
    const message = `Duplicate test case IDs found: ${duplicates.join(", ")}`;
    if (allowDuplicates) {
      warnings.push(message);
    } else {
      errors.push(message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
