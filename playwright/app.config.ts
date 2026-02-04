import type { AppConfig } from "testwright";

/**
 * Example application configuration
 *
 * Each test repository configures a single application that may be
 * deployed across multiple domains and environments.
 */
export const appConfig: AppConfig = {
  slug: "member-landing",
  name: "Member Landing Page",
  type: "spa",
  requiresAuth: true,
  domains: [
    {
      domain: "domain-alpha",
      environments: [
        { environment: "dev", baseUrl: "https://www-dev.domain-alpha.com" },
        { environment: "staging", baseUrl: "https://www-staging.domain-alpha.com" },
        { environment: "prod", baseUrl: "https://www.domain-alpha.com" },
      ],
    },
    {
      domain: "domain-beta",
      environments: [
        { environment: "dev", baseUrl: "https://www-dev.domain-beta.com" },
        { environment: "staging", baseUrl: "https://www-staging.domain-beta.com" },
        { environment: "prod", baseUrl: "https://www.domain-beta.com" },
      ],
    },
  ],
};
