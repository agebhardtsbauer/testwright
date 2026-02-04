# QA Testing Module - Design Document

## Project Overview

A reusable Node.js/TypeScript module that provides standardized Playwright testing infrastructure for multiple domains and SPA applications across the company.

### High-Level Goals

1. **Reusable Testing Infrastructure**: QA teams import this module into their app-specific test repositories
2. **Smart Defaults with Flexibility**: Ships with opinionated Playwright config that can be overridden per-project
3. **Multi-Domain/Multi-App Support**: Handle 28+ domains, each hosting multiple SPA applications
4. **Common Helper Functions**: Reduce boilerplate with shared actions (login, navigation, assertions)
5. **Session Management**: Cache and reuse authenticated sessions across tests
6. **Test User Management**: Type-safe test user registry with tag-based filtering
7. **Custom Fixtures**: Playwright fixtures for authenticated contexts, specific user types, and domain/app combinations

---

## Architecture

### Module Distribution
- **NPM Package**: Published as `@company/qa-testing-module` (or similar internal registry)
- **Import Pattern**: QA teams install and import helpers, fixtures, and config
- **TypeScript-First**: Full type safety for configs, users, helpers, and assertions

### Design Philosophy
- **Functional Helpers** over Page Object Models for flexibility
- **Fixtures** for test state setup (authentication, navigation)
- **Composable**: Helpers and fixtures can be combined
- **Convention over Configuration**: Smart defaults, override when needed

---

## Application & Domain Model

### Application-Centric Testing
Each test repository tests a **single application** (e.g., "landing", "contacts", "assessments") that is deployed across **one or more domains**. The module provides configuration to define:
- Application slug (same as the route path)
- Domains where the app is deployed
- Environment (dev/staging/prod)

### Application Configuration
```typescript
interface AppConfig {
  slug: string;                    // App identifier and route, e.g., "member-landing", "contacts"
  name?: string;                   // Human-readable name (optional)
  type: 'spa' | 'aem';            // /s/ prefix for SPA, /x/ for AEM
  domains: DomainDeployment[];     // List of domains where this app is deployed
  requiresAuth: boolean;           // Does this app require login?
}

interface DomainDeployment {
  domain: string;                  // Domain name, e.g., "domain-alpha"
  environments: EnvironmentConfig[];
}

interface EnvironmentConfig {
  environment: Environment;        // 'dev' | 'staging' | 'prod'
  baseUrl: string;                 // e.g., "https://www-dev.domain-alpha.com"
}

type Environment = 'dev' | 'staging' | 'prod';
```

### URL Generation
The combination of **app slug + domain + environment** generates the test URL:

```typescript
// Example: member-landing app on domain-alpha in dev
// Result: https://www-dev.domain-alpha.com/s/member-landing

function buildAppUrl(
  app: AppConfig, 
  domain: string, 
  environment: Environment
): string {
  const deployment = app.domains.find(d => d.domain === domain);
  const envConfig = deployment?.environments.find(e => e.environment === environment);
  const prefix = app.type === 'spa' ? '/s/' : '/x/';
  
  return `${envConfig.baseUrl}${prefix}${app.slug}`;
}
```

### Per-Project App Configuration
Each test repository configures its **single application** in a config file:

```typescript
// member-landing-tests/app.config.ts
import { AppConfig } from '@company/qa-testing-module';

export const appConfig: AppConfig = {
  slug: 'member-landing',
  name: 'Member Landing Page',
  type: 'spa',
  requiresAuth: true,
  domains: [
    {
      domain: 'domain-alpha',
      environments: [
        { environment: 'dev', baseUrl: 'https://www-dev.domain-alpha.com' },
        { environment: 'staging', baseUrl: 'https://www-staging.domain-alpha.com' },
        { environment: 'prod', baseUrl: 'https://www.domain-alpha.com' },
      ]
    },
    {
      domain: 'domain-beta',
      environments: [
        { environment: 'dev', baseUrl: 'https://www-dev.domain-beta.com' },
        { environment: 'staging', baseUrl: 'https://www-staging.domain-beta.com' },
        { environment: 'prod', baseUrl: 'https://www.domain-beta.com' },
      ]
    },
    // ... more domains where member-landing is deployed
  ]
};
```

### Environment Variable Support
Tests can target specific environment/domain via env vars:
- `TEST_ENV=dev|staging|prod` (defaults to 'dev')
- `TEST_DOMAIN=domain-alpha|domain-beta|...` (defaults to first domain in config)

```typescript
// Automatically build URL based on env vars
const targetEnv = process.env.TEST_ENV || 'dev';
const targetDomain = process.env.TEST_DOMAIN || appConfig.domains[0].domain;
const testUrl = buildAppUrl(appConfig, targetDomain, targetEnv);
```

---

## Test User Management

### User Type Definition
```typescript
interface TestUser {
  id: string;                      // Unique identifier
  email: string;
  firstName?: string;              // Optional: Many test users don't need names
  lastName?: string;               // Optional: Many test users don't need names
  middleName?: string;
  password?: string;               // Optional: Uses DEFAULT_TEST_PASSWORD if not specified
  type: UserType;                  // 'member' | 'client' | 'practitioner' | etc.
  tags: string[];                  // Feature flags, e.g., ['hasPaymentMethod', 'hasSubscription', 'isActive']
  environment: Environment;        // Test users are environment-specific
  domain: string;                  // Test users are domain-specific (e.g., 'domain-alpha')
}

type UserType = 'member' | 'client' | 'practitioner' | 'admin' | 'guest';
type Environment = 'dev' | 'staging' | 'prod';
```

### User Registry
- `testUsers.ts` file with array of test users
- Users are scoped to specific environment + domain combinations
- Default password shared across most users: `DEFAULT_TEST_PASSWORD` env var
- Individual passwords override default when specified
- Tag-based filtering: `getUsersByTags(['hasSubscription', 'isActive'], 'dev', 'domain-alpha')`
- Type-based filtering: `getUsersByType('member', 'dev', 'domain-alpha')`

### Example User Registry
```typescript
// testUsers.ts
export const testUsers: TestUser[] = [
  {
    id: 'member-1-dev-alpha',
    email: 'member1@domain-alpha.com',
    firstName: 'Test',
    lastName: 'Member',
    // password not specified, uses DEFAULT_TEST_PASSWORD
    type: 'member',
    tags: ['isActive', 'hasSubscription', 'hasPaymentMethod'],
    environment: 'dev',
    domain: 'domain-alpha'
  },
  {
    id: 'member-2-dev-alpha',
    email: 'member2@domain-alpha.com',
    // firstName/lastName optional
    type: 'member',
    tags: ['isActive'], // Basic member, no premium features
    environment: 'dev',
    domain: 'domain-alpha'
  },
  {
    id: 'practitioner-1-dev-alpha',
    email: 'practitioner1@domain-alpha.com',
    password: process.env.SPECIAL_PRACTITIONER_PASSWORD, // Override default
    type: 'practitioner',
    tags: ['isActive', 'canPrescribe'],
    environment: 'dev',
    domain: 'domain-alpha'
  },
  {
    id: 'member-1-staging-beta',
    email: 'member1@domain-beta.com',
    type: 'member',
    tags: ['isActive', 'hasSubscription'],
    environment: 'staging',
    domain: 'domain-beta'
  },
  // ... more users for different domains and environments
];
```

### Security Considerations
- Most test users share a common password: `process.env.DEFAULT_TEST_PASSWORD`
- Individual user passwords can override: `password: process.env.TEST_USER_SPECIAL_PASSWORD`
- Support for vault/secrets manager integration (future)

---

## Session Management & Authentication

### Authentication Flow
1. **First Login**: Execute full login flow, save session state to disk
2. **Subsequent Tests**: Load saved session state, skip login
3. **Session Invalidation**: Automatically re-authenticate if session expired

### Storage Strategy
```typescript
interface SessionCache {
  userId: string;
  domain: string;
  environment: Environment;
  storageStatePath: string;        // Path to Playwright storage state JSON
  createdAt: Date;
  expiresAt: Date;
}
```

### Cache Location
- `.auth/` directory in test project (gitignored)
- Per-user, per-domain, per-environment session files: 
  - `.auth/member-user-1_domain-alpha_dev.json`
  - `.auth/member-user-1_domain-alpha_staging.json`
  - `.auth/practitioner-user-5_domain-beta_dev.json`
- Cache invalidation after configurable TTL (default: 24 hours)

### Helper Functions
```typescript
// Get or create authenticated session
async function getAuthenticatedSession(
  user: TestUser, 
  domain: string,
  environment: Environment
): Promise<string>

// Clear all cached sessions
async function clearSessionCache(): Promise<void>

// Clear specific user/domain/environment session
async function clearSession(
  userId: string, 
  domain: string,
  environment: Environment
): Promise<void>
```

---

## Helper Functions (Functional API)

### Authentication Helpers
```typescript
/**
 * Execute login flow for a specific app, domain, and environment
 * @returns Authenticated Page object
 */
async function loginToApp(
  page: Page,
  app: AppConfig,
  user: TestUser,
  options?: {
    domain?: string;      // Uses first domain in app.domains if not specified
    environment?: Environment;  // Uses TEST_ENV or 'dev' if not specified
  }
): Promise<Page>

/**
 * Start new session with cached authentication
 * Uses stored session state if available, otherwise performs login
 */
async function startAuthenticatedSession(
  context: BrowserContext,
  app: AppConfig,
  user: TestUser,
  options?: {
    domain?: string;
    environment?: Environment;
  }
): Promise<Page>

/**
 * Fill login form fields (domain-agnostic)
 * Assumes standard email/password form structure
 */
async function fillLoginForm(
  page: Page,
  email: string,
  password: string
): Promise<void>

/**
 * Submit login form and wait for navigation to complete
 */
async function submitLoginForm(page: Page): Promise<void>

/**
 * Get password for user (returns user password or default)
 */
function getUserPassword(user: TestUser): string {
  return user.password || process.env.DEFAULT_TEST_PASSWORD || '';
}
```

### Navigation Helpers
```typescript
/**
 * Navigate to the configured app on specified domain/environment
 * Uses TEST_ENV and TEST_DOMAIN env vars if options not provided
 */
async function navigateToApp(
  page: Page,
  app: AppConfig,
  options?: {
    domain?: string;
    environment?: Environment;
  }
): Promise<void>

/**
 * Navigate to route within the current app
 * @example navigateToRoute(page, '/profile')
 * Result: /s/member-landing/profile (if current app is member-landing)
 */
async function navigateToRoute(
  page: Page,
  route: string
): Promise<void>

/**
 * Navigate to absolute route on current domain
 * @example navigateToAbsoluteRoute(page, '/s/contacts')
 */
async function navigateToAbsoluteRoute(
  page: Page,
  route: string
): Promise<void>

/**
 * Navigate and wait for SPA to be ready
 * Waits for network idle and app-specific ready signals
 */
async function navigateAndWaitForSPA(
  page: Page,
  url: string,
  options?: { timeout?: number }
): Promise<void>

/**
 * Build URL for app based on domain and environment
 * Utility function used by other helpers
 */
function buildAppUrl(
  app: AppConfig,
  domain: string,
  environment: Environment
): string
```

### Waiting Helpers
```typescript
/**
 * Wait for loading spinner to disappear
 * Supports multiple spinner selectors across different apps
 */
async function waitForLoadingSpinner(
  page: Page,
  options?: { timeout?: number }
): Promise<void>

/**
 * Wait for specific element to be visible and stable
 */
async function waitForElement(
  page: Page,
  selector: string,
  options?: { timeout?: number; state?: 'visible' | 'attached' | 'hidden' }
): Promise<void>

/**
 * Wait for network requests to settle
 * Useful after actions that trigger API calls
 */
async function waitForNetworkIdle(
  page: Page,
  options?: { timeout?: number; maxInflight?: number }
): Promise<void>

/**
 * Wait for SPA route transition to complete
 * Watches for URL change and network idle
 */
async function waitForRouteTransition(
  page: Page,
  expectedRoute?: string | RegExp
): Promise<void>
```

### Interaction Helpers
```typescript
/**
 * Click element with automatic retry and visibility wait
 */
async function clickElement(
  page: Page,
  selector: string,
  options?: { force?: boolean; timeout?: number }
): Promise<void>

/**
 * Fill input field with automatic focus and validation
 */
async function fillInput(
  page: Page,
  selector: string,
  value: string,
  options?: { clear?: boolean; blur?: boolean }
): Promise<void>

/**
 * Select dropdown option by text or value
 */
async function selectDropdownOption(
  page: Page,
  selector: string,
  optionValue: string,
  options?: { byLabel?: boolean }
): Promise<void>

/**
 * Upload file to input element
 */
async function uploadFile(
  page: Page,
  selector: string,
  filePath: string
): Promise<void>
```

### Verification Helpers (Custom Assertions)
```typescript
/**
 * Verify link properties (text, URL, opens in new tab)
 */
async function verifyLink(
  page: Page,
  options: {
    locator: Locator | string;
    text?: string;
    url?: string | RegExp;
    isNewTab?: boolean;
  }
): Promise<void>

/**
 * Verify element text content
 */
async function verifyText(
  page: Page,
  selector: string,
  expectedText: string | RegExp
): Promise<void>

/**
 * Verify element visibility state
 */
async function verifyVisible(
  page: Page,
  selector: string,
  shouldBeVisible: boolean = true
): Promise<void>

/**
 * Verify URL matches expected pattern
 */
async function verifyURL(
  page: Page,
  expectedUrl: string | RegExp
): Promise<void>

/**
 * Verify API response contains expected data
 * Intercepts network request and validates response
 */
async function verifyAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  validator: (response: Response) => boolean | Promise<boolean>
): Promise<void>
```

---

## Playwright Fixtures

### Base Fixtures

#### `authenticatedPage`
Provides a page with default test user already logged in to the configured app.

```typescript
// Uses TEST_ENV and TEST_DOMAIN from environment, or defaults
test('my test', async ({ authenticatedPage }) => {
  // Page is already authenticated and at the app's base URL
  await authenticatedPage.getByRole('button', { name: 'Profile' }).click();
});
```

#### `authenticatedContext`
Provides a browser context with authentication, allows creating multiple pages.

```typescript
test('multi-page test', async ({ authenticatedContext }) => {
  const page1 = await authenticatedContext.newPage();
  const page2 = await authenticatedContext.newPage();
});
```

### User-Type Fixtures

#### `memberPage`
Page authenticated as a member user for current domain/environment.

#### `practitionerPage`
Page authenticated as a practitioner user for current domain/environment.

#### `clientPage`
Page authenticated as a client user for current domain/environment.

```typescript
test('member-specific feature', async ({ memberPage }) => {
  // Has member user session loaded for TEST_DOMAIN and TEST_ENV
  await memberPage.goto('/profile');
});
```

### App Navigation Fixtures

#### `appPage`
Provides page already navigated to the configured app on specified domain/environment.

```typescript
// Configure via environment variables or test-level config
test('landing page test', async ({ appPage }) => {
  // Already at the app URL with authentication
  await appPage.getByRole('button', { name: 'Profile' }).click();
});
```

#### `appPageWithUser`
Combines app navigation + specific user type.

```typescript
test.use({
  appPageWithUser: { 
    userType: 'member',
    domain: 'domain-alpha',  // Optional, uses TEST_DOMAIN if not set
    environment: 'dev'       // Optional, uses TEST_ENV if not set
  }
});

test('member flow', async ({ appPageWithUser }) => {
  // Already at app with member user authenticated
});
```

### Dynamic User Fixtures

#### `userWithTags`
Function that returns a test user matching specified tags for current domain/environment.

```typescript
test('payment flow', async ({ userWithTags, page }) => {
  // Automatically filters by TEST_DOMAIN and TEST_ENV
  const user = userWithTags(['hasPaymentMethod', 'hasSubscription']);
  await loginToApp(page, appConfig, user);
});
```

#### `userByType`
Function that returns a test user of specified type for current domain/environment.

```typescript
test('practitioner dashboard', async ({ userByType, page }) => {
  const practitioner = userByType('practitioner');
  await loginToApp(page, appConfig, practitioner);
});
```

---

## Playwright Configuration

### Default Config
Module ships with `playwright.config.ts` that includes:
- Parallel execution settings
- Browser configurations (Chromium, Firefox, WebKit)
- Screenshot/video on failure
- Trace viewer setup
- Retry logic
- Test timeout defaults
- Base URL handling via environment variables

### Override Strategy
QA projects can override config in their own `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';
import { defaultConfig } from '@company/qa-testing-module';
import { appConfig } from './app.config';
import { buildAppUrl } from '@company/qa-testing-module';

// Build base URL from app config and env vars
const targetDomain = process.env.TEST_DOMAIN || appConfig.domains[0].domain;
const targetEnv = process.env.TEST_ENV || 'dev';
const baseURL = buildAppUrl(appConfig, targetDomain, targetEnv);

export default defineConfig({
  ...defaultConfig,
  // Override specific settings
  testDir: './tests',
  workers: 4,
  use: {
    ...defaultConfig.use,
    baseURL,
  },
});
```

### Environment Variable Support
- `TEST_ENV`: dev | staging | prod (defaults to 'dev')
- `TEST_DOMAIN`: Target domain name (defaults to first domain in app.config.ts)
- `DEFAULT_TEST_PASSWORD`: Common password for test users
- `HEADLESS`: Run in headless mode (default: true in CI)
- `SLOWMO`: Slow down operations for debugging

---

## Test Case Tracking

### Overview
Each test must be associated with one or more test case IDs from the test management system. The module captures test results and generates JSON payloads indicating which test cases passed or failed in a given test run.

### Test Case Annotation
Tests specify their test case ID(s) using Playwright's test metadata:

```typescript
test('member can view profile', async ({ page }) => {
  // Test implementation
});

// Associate test with test case ID
test.use({ testCaseId: 'TC-1234' });
```

Or use a custom helper for cleaner syntax:

```typescript
import { testCase } from '@company/qa-testing-module';

testCase('TC-1234', 'member can view profile', async ({ page }) => {
  // Test implementation
});

// Multiple test cases satisfied by one test
testCase(['TC-1234', 'TC-1235'], 'profile displays user info', async ({ page }) => {
  // Test implementation
});
```

### Test Case Metadata Type
```typescript
interface TestCaseMetadata {
  testCaseId: string | string[];     // Single ID or array of IDs
  description?: string;               // Optional additional context
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  tags?: string[];                    // Additional categorization
}
```

### Result Payload Generation

#### JSON Payload Structure
```typescript
interface TestRunResult {
  runId: string;                      // Unique test run identifier
  timestamp: string;                  // ISO 8601 timestamp
  environment: Environment;           // dev | staging | prod
  domain: string;                     // Domain tested
  app: string;                        // App slug
  results: TestCaseResult[];
}

interface TestCaseResult {
  testCaseId: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;                   // Milliseconds
  error?: string;                     // Error message if failed
  stackTrace?: string;                // Stack trace if failed
  retries?: number;                   // Number of retries attempted
  screenshots?: string[];             // Paths to failure screenshots
}
```

#### Example Output
```json
{
  "runId": "run-2024-01-28-1430-abc123",
  "timestamp": "2024-01-28T14:30:00.000Z",
  "environment": "dev",
  "domain": "domain-alpha",
  "app": "member-landing",
  "results": [
    {
      "testCaseId": "TC-1234",
      "status": "passed",
      "duration": 3240
    },
    {
      "testCaseId": "TC-1235",
      "status": "failed",
      "duration": 5120,
      "error": "Expected button to be visible",
      "stackTrace": "Error: Expected button...\n    at...",
      "screenshots": ["/screenshots/TC-1235-failure.png"]
    }
  ]
}
```

### Custom Reporter
The module includes a custom Playwright reporter that:
- Extracts test case IDs from test metadata
- Captures pass/fail status for each test case
- Generates JSON payload at end of test run
- Optionally posts results to test management API

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['@company/qa-testing-module/reporter', {
      outputFile: './test-results/test-case-results.json',
      apiEndpoint: process.env.TEST_MGMT_API,  // Optional: POST results
      apiKey: process.env.TEST_MGMT_API_KEY
    }]
  ]
});
```

### Validation
The reporter validates that:
- Every test has at least one test case ID
- Test case IDs follow expected format (e.g., `TC-\d+`)
- No duplicate test case IDs within a test run (warns if found)

```typescript
// Reporter will fail CI if tests missing test case IDs
reporter: [
  ['@company/qa-testing-module/reporter', {
    strictMode: true,  // Fail build if any test lacks testCaseId
    allowDuplicates: false  // Fail if same test case ID used multiple times
  }]
]
```

### Helper Functions

```typescript
/**
 * Create a test with required test case ID
 * Wrapper around Playwright's test() that enforces test case metadata
 */
function testCase(
  testCaseId: string | string[],
  title: string,
  testFn: (fixtures) => Promise<void>
): void

/**
 * Manually report test case result (for non-Playwright tests)
 */
async function reportTestCaseResult(
  result: TestCaseResult,
  options?: { outputFile?: string }
): Promise<void>

/**
 * Get test run summary
 */
function getTestRunSummary(): {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  testCases: string[];
}
```

---

## Directory Structure

### Module Structure
```
@company/qa-testing-module/
├── src/
│   ├── config/
│   │   ├── testUsers.ts            # Test user registry
│   │   └── playwright.config.ts    # Default Playwright config
│   ├── helpers/
│   │   ├── auth.ts                 # Authentication helpers
│   │   ├── navigation.ts           # Navigation helpers
│   │   ├── waiting.ts              # Waiting helpers
│   │   ├── interaction.ts          # Interaction helpers
│   │   ├── verification.ts         # Custom assertions
│   │   └── testCase.ts             # Test case annotation helper
│   ├── fixtures/
│   │   ├── authenticated.ts        # Auth fixtures
│   │   ├── userType.ts            # User type fixtures
│   │   ├── app.ts                 # App navigation fixtures
│   │   └── index.ts               # Export all fixtures
│   ├── reporter/
│   │   ├── index.ts               # Custom Playwright reporter
│   │   ├── payloadGenerator.ts    # JSON payload generation
│   │   └── validator.ts           # Test case ID validation
│   ├── utils/
│   │   ├── sessionCache.ts        # Session management
│   │   ├── userFilter.ts          # User filtering logic
│   │   ├── urlBuilder.ts          # App URL construction
│   │   └── logger.ts              # Logging utilities
│   ├── types/
│   │   ├── app.ts                 # App and environment types
│   │   ├── user.ts                # User types
│   │   ├── testCase.ts            # Test case tracking types
│   │   └── config.ts              # Config types
│   └── index.ts                   # Main export file
├── package.json
├── tsconfig.json
└── README.md
```

### QA Project Structure (Consumer)
```
member-landing-tests/                # App-specific test repo
├── tests/
│   ├── landing-page.spec.ts
│   ├── profile.spec.ts
│   └── navigation.spec.ts
├── test-results/
│   ├── test-case-results.json      # Generated test case results
│   └── screenshots/                # Failure screenshots
├── .auth/                           # Session cache (gitignored)
│   ├── member-user-1_domain-alpha_dev.json
│   ├── member-user-1_domain-alpha_staging.json
│   └── practitioner-user-1_domain-beta_dev.json
├── app.config.ts                    # App configuration (domains, environments)
├── playwright.config.ts             # Project-specific Playwright overrides
├── .env                            # Environment variables (TEST_ENV, TEST_DOMAIN)
└── package.json                    # Includes @company/qa-testing-module
```

---

## Usage Examples

### Example 1: Basic Test with Test Case ID
```typescript
import { testCase } from '@company/qa-testing-module';
import { loginToApp, navigateToRoute } from '@company/qa-testing-module';
import { appConfig } from '../app.config';
import { testUsers } from '@company/qa-testing-module/config';

testCase('TC-1234', 'member can view profile', async ({ page }) => {
  // Get a member user for current TEST_DOMAIN and TEST_ENV
  const user = testUsers.find(u => 
    u.type === 'member' && 
    u.domain === process.env.TEST_DOMAIN &&
    u.environment === process.env.TEST_ENV
  );
  
  await loginToApp(page, appConfig, user);
  await navigateToRoute(page, '/profile');
  
  await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
});
```

### Example 2: Multiple Test Cases in One Test
```typescript
import { testCase } from '@company/qa-testing-module';

// This test satisfies multiple test cases
testCase(
  ['TC-1234', 'TC-1235', 'TC-1236'],
  'member profile displays all required fields',
  async ({ appPage }) => {
    await expect(appPage.getByRole('heading', { name: 'My Profile' })).toBeVisible();
    await expect(appPage.getByText(/Email:/)).toBeVisible();
    await expect(appPage.getByText(/Member Since:/)).toBeVisible();
  }
);
```

### Example 3: Using Fixtures with Test Case ID
```typescript
import { testCase } from '@company/qa-testing-module';

testCase('TC-5678', 'profile button visible on landing', async ({ appPage }) => {
  // Already authenticated and at app URL
  await expect(appPage.getByRole('button', { name: 'Profile' })).toBeVisible();
});
```

### Example 4: Custom Verifications with Test Case ID
```typescript
import { testCase, verifyLink } from '@company/qa-testing-module';

testCase('TC-9012', 'contact link navigates correctly', async ({ authenticatedPage }) => {
  await verifyLink(authenticatedPage, {
    locator: 'a[data-testid="contact-link"]',
    text: 'View Contacts',
    url: /\/s\/contacts$/,
    isNewTab: false
  });
});
```

### Example 5: Tag-Based User Selection with Test Case ID
```typescript
import { testCase, getUsersByTags, loginToApp } from '@company/qa-testing-module';
import { appConfig } from '../app.config';

testCase('TC-3456', 'payment flow for subscribed user', async ({ page }) => {
  const targetDomain = process.env.TEST_DOMAIN || appConfig.domains[0].domain;
  const targetEnv = process.env.TEST_ENV || 'dev';
  
  const users = getUsersByTags(
    ['hasSubscription', 'hasPaymentMethod'],
    targetEnv,
    targetDomain
  );
  const user = users[0];
  
  await loginToApp(page, appConfig, user);
  // Continue with payment flow test
});
```

### Example 6: Multi-Domain Testing with Test Case IDs
```typescript
import { testCase } from '@company/qa-testing-module';
import { appConfig } from '../app.config';

// Test same app behavior across different domains
for (const domainDeployment of appConfig.domains) {
  test.describe(`${domainDeployment.domain} domain`, () => {
    testCase(
      `TC-7890-${domainDeployment.domain}`,
      `landing page loads on ${domainDeployment.domain}`,
      async ({ appPage }) => {
        await expect(appPage.getByRole('main')).toBeVisible();
      }
    );
  });
}
```

### Example 7: Accessing Generated Test Results
```typescript
// After test run completes, JSON file is generated
// test-results/test-case-results.json

import { readFileSync } from 'fs';

const results = JSON.parse(
  readFileSync('./test-results/test-case-results.json', 'utf-8')
);

console.log(`Test run ID: ${results.runId}`);
console.log(`Total test cases: ${results.results.length}`);
console.log(`Passed: ${results.results.filter(r => r.status === 'passed').length}`);
console.log(`Failed: ${results.results.filter(r => r.status === 'failed').length}`);
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
- [x] Project setup (TypeScript, build config)
- [x] Type definitions (AppConfig, TestUser, Environment, TestCaseMetadata)
- [x] URL builder utility (buildAppUrl function)
- [x] Basic Playwright config export

### Phase 2: Session Management
- [x] Session cache implementation
- [x] Authentication helper functions
- [x] Storage state save/load

### Phase 3: Helper Functions
- [x] Authentication helpers (loginToApp, fillLoginForm)
- [x] Navigation helpers (navigateToApp, navigateToRoute)
- [x] Waiting helpers (waitForLoadingSpinner, waitForNetworkIdle)
- [x] Interaction helpers (clickElement, fillInput)
- [x] Verification helpers (verifyLink, verifyText)
- [x] User filtering utilities (getUsersByTags, getUsersByType)

### Phase 4: Test Case Tracking
- [x] Test case metadata types
- [x] testCase() helper function
- [x] Custom Playwright reporter implementation
- [x] JSON payload generator
- [x] Test case ID validation
- [x] Reporter configuration options

### Phase 5: Fixtures
- [x] Base authenticated fixtures
- [x] User-type fixtures
- [x] App navigation fixtures
- [x] Dynamic user selection fixtures

### Phase 6: Testing & Documentation
- [x] Unit tests for utilities
- [ ] Integration tests for fixtures
- [ ] Reporter integration tests
- [x] Comprehensive README
- [x] Usage examples
- [x] API documentation

### Phase 7: Distribution
- [ ] NPM package setup
- [ ] Versioning strategy
- [ ] CI/CD pipeline
- [ ] Internal registry publishing

---

## Open Questions & Future Enhancements

### Open Questions
- How should multi-factor authentication be handled?
- Should the module support API-based authentication (skip UI login)?
- How to handle domain-specific login flows that vary (OAuth, SSO, custom forms)?
- Should test users be synced from a central service or remain config-based?
- How should we handle apps that exist on some domains but not others in multi-domain tests?
- Should the module provide app.config.ts templates for common app types?

### Future Enhancements
- **Visual regression testing**: Integration with Percy, Applitools, or Playwright screenshots
- **Performance monitoring**: Lighthouse integration, timing metrics
- **Accessibility testing**: Axe-core integration
- **API mocking**: Mock service worker (MSW) helpers
- **Database seeding**: Pre-populate test data for specific scenarios
- **Multi-browser support**: Enhanced mobile/tablet testing
- **Reporting dashboard**: Centralized test result visualization
- **Flake detection**: Automatic retry and flake reporting
- **Test management integration**: Direct API integration with test management systems (TestRail, Zephyr, qTest, etc.)
- **Test case sync**: Auto-create/update test cases in management system from code annotations
- **Bulk operations**: Batch test case status updates via API
- **Historical tracking**: Track test case pass/fail trends over time

---

## Success Metrics

- **Adoption**: Number of QA repos using the module
- **Test execution speed**: Average test duration with session caching
- **Code reuse**: Percentage of tests using shared helpers vs custom code
- **Maintenance burden**: Reduced time to update cross-domain changes
- **Developer satisfaction**: QA team feedback on usability

---

## Notes for Claude Code

This document should drive development of the `@company/qa-testing-module` package. Start with:

1. TypeScript configuration and project structure
2. Type definitions (AppConfig, TestUser, Environment, TestCaseMetadata, TestRunResult)
3. URL builder utility (buildAppUrl function)
4. User filtering utilities (getUsersByTags, getUsersByType with env/domain filtering)
5. Session management infrastructure (scoped to user + domain + environment)
6. Basic helper function stubs
7. Playwright config with sensible defaults
8. Test case tracking system (testCase helper, reporter, payload generator)
9. Fixture implementations

**Key Implementation Notes:**
- All users filtered by environment and domain by default
- Session cache files named: `{userId}_{domain}_{environment}.json`
- URL generation: `{baseUrl}/{type-prefix}/{slug}` where type-prefix is `/s/` or `/x/`
- Most test users share `DEFAULT_TEST_PASSWORD` unless overridden
- App config is per-project, not in the module (each test repo has its own app.config.ts)
- **Every test must have a test case ID** - enforce via reporter strictMode option
- Test case results JSON generated at `./test-results/test-case-results.json`
- Reporter should validate test case ID format and warn on duplicates

**Test Case Reporter Details:**
- Extend Playwright's Reporter interface
- Capture test metadata in onTestEnd hook
- Extract testCaseId from test annotations/metadata
- Generate JSON payload in onEnd hook
- Support optional API posting for test management integration
- Validate all tests have test case IDs when strictMode enabled

Prioritize type safety, clear documentation, and extensibility throughout implementation.
