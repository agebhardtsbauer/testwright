# Testwright

Reusable Playwright testing infrastructure for multi-domain SPA applications.

## Features

- **Session Management** - Cache and reuse authenticated sessions across tests
- **Test User Management** - Type-safe test user registry with tag-based filtering
- **Helper Functions** - Authentication, navigation, waiting, interaction, and verification helpers
- **Custom Fixtures** - Playwright fixtures for authenticated contexts and user types
- **Test Case Tracking** - Custom reporter for test case ID tracking and result payloads
- **Multi-Domain Support** - Handle multiple domains and environments from a single test suite

## Installation

```bash
npm install testwright
```

## Quick Start

### 1. Create App Configuration

```typescript
// app.config.ts
import type { AppConfig } from 'testwright';

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
      ],
    },
  ],
};
```

### 2. Create Test Users

```typescript
// testUsers.ts
import type { TestUser } from 'testwright';

export const testUsers: TestUser[] = [
  {
    id: 'member-1-dev-alpha',
    email: 'member1@test.com',
    type: 'member',
    tags: ['isActive', 'hasSubscription'],
    environment: 'dev',
    domain: 'domain-alpha',
  },
];
```

### 3. Configure Playwright

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { defaultConfig, buildAppUrlFromEnv } from 'testwright/config';
import { appConfig } from './app.config';

export default defineConfig({
  ...defaultConfig,
  use: {
    ...defaultConfig.use,
    baseURL: buildAppUrlFromEnv(appConfig),
  },
});
```

### 4. Write Tests

```typescript
// tests/landing.spec.ts
import { test, expect } from 'testwright/fixtures';
import { appConfig } from '../app.config';
import { testUsers } from '../testUsers';

test.use({ appConfig, testUsers });

test('user can view profile', async ({ memberPage }) => {
  await memberPage.goto('/profile');
  await expect(memberPage.getByRole('heading')).toHaveText('Profile');
});
```

## API Reference

### Types

```typescript
import type {
  AppConfig,
  TestUser,
  Environment,
  UserType,
  TestCaseMetadata,
  TestRunResult,
} from 'testwright';
```

### URL Building

```typescript
import {
  buildAppUrl,
  buildAppUrlFromEnv,
  getTargetDomain,
  getTargetEnvironment,
} from 'testwright';

// Build URL for specific domain/environment
const url = buildAppUrl(appConfig, 'domain-alpha', 'dev');

// Build URL using TEST_DOMAIN and TEST_ENV environment variables
const url = buildAppUrlFromEnv(appConfig);
```

### User Filtering

```typescript
import {
  getUsersByTags,
  getUsersByType,
  getUserById,
  getUserPassword,
} from 'testwright';

// Get users with specific tags
const premiumUsers = getUsersByTags(testUsers, ['hasSubscription', 'isActive'], 'dev', 'domain-alpha');

// Get users by type
const members = getUsersByType(testUsers, 'member', 'dev', 'domain-alpha');
```

### Session Management

```typescript
import {
  isSessionValid,
  saveSession,
  clearSession,
  clearSessionCache,
} from 'testwright';

// Check if session is valid
const valid = await isSessionValid('user-id', 'domain-alpha', 'dev');

// Clear all cached sessions
await clearSessionCache();
```

### Helper Functions

#### Authentication

```typescript
import {
  loginToApp,
  startAuthenticatedSession,
  fillLoginForm,
  submitLoginForm,
  logout,
} from 'testwright';

// Full login flow
await loginToApp(page, appConfig, user);

// Start with cached session
const page = await startAuthenticatedSession(context, appConfig, user);
```

#### Navigation

```typescript
import {
  navigateToApp,
  navigateToRoute,
  navigateAndWaitForSPA,
} from 'testwright';

// Navigate to app base URL
await navigateToApp(page, appConfig, { domain: 'domain-alpha', environment: 'dev' });

// Navigate to route within app
await navigateToRoute(page, '/profile');
```

#### Waiting

```typescript
import {
  waitForLoadingSpinner,
  waitForElement,
  waitForNetworkIdle,
  waitForRouteTransition,
} from 'testwright';

await waitForLoadingSpinner(page);
await waitForElement(page, '[data-testid="content"]', { state: 'visible' });
```

#### Interaction

```typescript
import {
  clickElement,
  fillInput,
  selectDropdownOption,
  uploadFile,
} from 'testwright';

await clickElement(page, 'button[type="submit"]');
await fillInput(page, '#email', 'user@example.com');
await selectDropdownOption(page, '#country', 'United States', { byLabel: true });
```

#### Verification

```typescript
import {
  verifyLink,
  verifyText,
  verifyVisible,
  verifyURL,
  verifyAPIResponse,
} from 'testwright';

await verifyLink(page, {
  locator: 'a[data-testid="home"]',
  text: 'Home',
  url: '/home',
});

await verifyAPIResponse(page, '/api/user', async (response) => {
  const data = await response.json();
  return data.status === 'success';
});
```

### Test Case Tracking

```typescript
import { testCase } from 'testwright';

// Associate test with test case ID
testCase('TC-1234', 'user can view profile', async ({ page }) => {
  // Test implementation
});

// Multiple test cases
testCase(['TC-1234', 'TC-1235'], 'profile displays all fields', async ({ page }) => {
  // Test implementation
});
```

### Reporter Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['testwright/reporter', {
      outputFile: './test-results/test-case-results.json',
      strictMode: true,        // Fail if tests missing testCaseId
      allowDuplicates: false,  // Fail on duplicate test case IDs
      testCaseIdPattern: 'TC-\\d+',
    }],
  ],
});
```

### Fixtures

```typescript
import { test, expect } from 'testwright/fixtures';

test.use({
  appConfig,
  testUsers,
  defaultUserType: 'member',
});

// Available fixtures:
test('example', async ({
  // Authenticated fixtures
  authenticatedPage,
  authenticatedContext,

  // User type fixtures
  memberPage,
  practitionerPage,
  clientPage,
  adminPage,

  // App fixtures
  appPage,

  // Dynamic user selection
  userWithTags,
  userByType,
  currentDomain,
  currentEnvironment,
}) => {
  // Use fixtures
});
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_ENV` | Target environment (dev/staging/prod) | `dev` |
| `TEST_DOMAIN` | Target domain | First domain in config |
| `DEFAULT_TEST_PASSWORD` | Default password for test users | - |

## Project Structure

```
your-test-project/
├── tests/
│   └── *.spec.ts
├── app.config.ts
├── testUsers.ts
├── playwright.config.ts
└── .auth/              # Session cache (gitignored)
```

## License

ISC
