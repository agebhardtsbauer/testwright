/**
 * Environment types for test execution
 */
export type Environment = "dev" | "staging" | "prod";

/**
 * Application types determining URL prefix
 * - 'spa': Uses /s/ prefix
 * - 'aem': Uses /x/ prefix
 */
export type AppType = "spa" | "aem";

/**
 * Environment-specific configuration for a domain deployment
 */
export interface EnvironmentConfig {
  /** Target environment */
  environment: Environment;
  /** Base URL for this environment, e.g., "https://www-dev.domain-alpha.com" */
  baseUrl: string;
}

/**
 * Configuration for a domain where an app is deployed
 */
export interface DomainDeployment {
  /** Domain identifier, e.g., "domain-alpha" */
  domain: string;
  /** List of environments where the app is deployed on this domain */
  environments: EnvironmentConfig[];
}

/**
 * Application configuration
 *
 * Each test repository tests a single application that may be deployed
 * across multiple domains and environments.
 */
export interface AppConfig {
  /** App identifier and route path, e.g., "member-landing", "contacts" */
  slug: string;
  /** Human-readable name (optional) */
  name?: string;
  /** App type determining URL prefix: 'spa' uses /s/, 'aem' uses /x/ */
  type: AppType;
  /** List of domains where this app is deployed */
  domains: DomainDeployment[];
  /** Whether this app requires authentication */
  requiresAuth: boolean;
}
