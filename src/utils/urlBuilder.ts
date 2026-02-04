import type { AppConfig, Environment } from "../types/index.js";

/**
 * Get the URL prefix based on app type
 * - SPA apps use /s/ prefix
 * - AEM apps use /x/ prefix
 */
export function getAppTypePrefix(appType: "spa" | "aem"): string {
  return appType === "spa" ? "/s/" : "/x/";
}

/**
 * Build the full URL for an app based on domain and environment
 *
 * @param app - Application configuration
 * @param domain - Target domain name (e.g., "domain-alpha")
 * @param environment - Target environment (dev, staging, prod)
 * @returns Full URL to the app (e.g., "https://www-dev.domain-alpha.com/s/member-landing")
 * @throws Error if domain or environment is not found in app config
 *
 * @example
 * ```typescript
 * const url = buildAppUrl(appConfig, 'domain-alpha', 'dev');
 * // Returns: "https://www-dev.domain-alpha.com/s/member-landing"
 * ```
 */
export function buildAppUrl(
  app: AppConfig,
  domain: string,
  environment: Environment
): string {
  const deployment = app.domains.find((d) => d.domain === domain);

  if (!deployment) {
    const availableDomains = app.domains.map((d) => d.domain).join(", ");
    throw new Error(
      `Domain "${domain}" not found in app config for "${app.slug}". ` +
        `Available domains: ${availableDomains}`
    );
  }

  const envConfig = deployment.environments.find(
    (e) => e.environment === environment
  );

  if (!envConfig) {
    const availableEnvs = deployment.environments
      .map((e) => e.environment)
      .join(", ");
    throw new Error(
      `Environment "${environment}" not found for domain "${domain}" in app "${app.slug}". ` +
        `Available environments: ${availableEnvs}`
    );
  }

  const prefix = getAppTypePrefix(app.type);

  // Ensure no double slashes by removing trailing slash from baseUrl
  const baseUrl = envConfig.baseUrl.replace(/\/$/, "");

  return `${baseUrl}${prefix}${app.slug}`;
}

/**
 * Get the target domain from environment variable or app config default
 *
 * @param app - Application configuration
 * @returns Target domain name
 */
export function getTargetDomain(app: AppConfig): string {
  const envDomain = process.env["TEST_DOMAIN"];
  if (envDomain) {
    return envDomain;
  }

  const firstDomain = app.domains[0];
  if (!firstDomain) {
    throw new Error(`No domains configured for app "${app.slug}"`);
  }

  return firstDomain.domain;
}

/**
 * Get the target environment from environment variable or default to 'dev'
 *
 * @returns Target environment
 */
export function getTargetEnvironment(): Environment {
  const envValue = process.env["TEST_ENV"];

  if (envValue === "dev" || envValue === "staging" || envValue === "prod") {
    return envValue;
  }

  return "dev";
}

/**
 * Build app URL using environment variables for domain and environment
 *
 * Uses TEST_DOMAIN and TEST_ENV environment variables, falling back to
 * defaults (first domain in config, 'dev' environment).
 *
 * @param app - Application configuration
 * @returns Full URL to the app
 *
 * @example
 * ```typescript
 * // With TEST_DOMAIN=domain-alpha TEST_ENV=staging
 * const url = buildAppUrlFromEnv(appConfig);
 * // Returns: "https://www-staging.domain-alpha.com/s/member-landing"
 * ```
 */
export function buildAppUrlFromEnv(app: AppConfig): string {
  const domain = getTargetDomain(app);
  const environment = getTargetEnvironment();

  return buildAppUrl(app, domain, environment);
}
