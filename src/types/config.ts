/**
 * Session cache entry for storing authenticated browser state
 */
export interface SessionCache {
  /** User ID this session belongs to */
  userId: string;
  /** Domain this session is valid for */
  domain: string;
  /** Environment this session is valid for */
  environment: string;
  /** Path to Playwright storage state JSON file */
  storageStatePath: string;
  /** When the session was created */
  createdAt: Date;
  /** When the session expires */
  expiresAt: Date;
}

/**
 * Options for session management
 */
export interface SessionOptions {
  /** Time-to-live for cached sessions in milliseconds (default: 24 hours) */
  ttl?: number;
  /** Directory to store session cache files (default: .auth/) */
  cacheDir?: string;
}

/**
 * Reporter configuration options
 */
export interface ReporterOptions {
  /** Path to output the test case results JSON file */
  outputFile?: string;
  /** Optional API endpoint to POST results to */
  apiEndpoint?: string;
  /** API key for authentication with the test management API */
  apiKey?: string;
  /** Fail build if any test lacks a testCaseId (default: false) */
  strictMode?: boolean;
  /** Fail if same test case ID used multiple times (default: true) */
  allowDuplicates?: boolean;
  /** Expected format for test case IDs (regex pattern) */
  testCaseIdPattern?: string;
}

/**
 * Module-level configuration
 */
export interface TestwrightConfig {
  /** Session management options */
  session?: SessionOptions;
  /** Reporter options */
  reporter?: ReporterOptions;
}
