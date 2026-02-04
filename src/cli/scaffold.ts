import prompts from "prompts";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { AppType } from "../types/app.js";
import {
  generateEnvironmentUrls,
  generateAppConfig,
  generateTestUsers,
  generatePlaywrightConfig,
  generateTsConfig,
  generateGitignore,
  generateExampleSpec,
  getPackageJsonInstructions,
  formatPackageJsonInstructions,
  type ScaffoldOptions,
  type DomainConfig,
} from "./templates.js";

export async function scaffold(): Promise<void> {
  console.log("");
  console.log("Welcome to testwright scaffold!");
  console.log("This will create a new test project with all necessary configuration files.");
  console.log("");

  // Collect basic app info
  const basicInfo = await prompts(
    [
      {
        type: "text",
        name: "appSlug",
        message: "What is your app slug? (e.g., member-landing)",
        validate: (value) =>
          value.length > 0 ? true : "App slug is required",
      },
      {
        type: "select",
        name: "appType",
        message: "What type of app is this?",
        choices: [
          { title: "SPA (uses /s/ prefix)", value: "spa" },
          { title: "AEM (uses /x/ prefix)", value: "aem" },
        ],
        initial: 0,
      },
      {
        type: "confirm",
        name: "requiresAuth",
        message: "Does this app require authentication?",
        initial: true,
      },
      {
        type: "number",
        name: "domainCount",
        message: "How many domains will this app be deployed to?",
        initial: 1,
        min: 1,
        max: 50,
      },
    ],
    {
      onCancel: () => {
        console.log("\nScaffolding cancelled.");
        process.exit(0);
      },
    }
  );

  // Collect domain information
  const domains: DomainConfig[] = [];

  for (let i = 0; i < basicInfo.domainCount; i++) {
    console.log("");
    console.log(`Domain ${i + 1}:`);

    const domainInfo = await prompts(
      [
        {
          type: "text",
          name: "name",
          message: "Domain name (e.g., domain-alpha)",
          validate: (value) =>
            value.length > 0 ? true : "Domain name is required",
        },
        {
          type: "text",
          name: "devUrl",
          message: "Dev environment URL (e.g., https://www-dev.acme.com)",
          validate: (value) => {
            if (!value.length) return "Dev URL is required";
            try {
              new URL(value);
              return true;
            } catch {
              return "Please enter a valid URL";
            }
          },
        },
      ],
      {
        onCancel: () => {
          console.log("\nScaffolding cancelled.");
          process.exit(0);
        },
      }
    );

    const urls = generateEnvironmentUrls(domainInfo.devUrl);

    domains.push({
      name: domainInfo.name,
      devUrl: urls.dev,
      stagingUrl: urls.staging,
      prodUrl: urls.prod,
    });
  }

  const options: ScaffoldOptions = {
    appSlug: basicInfo.appSlug,
    appType: basicInfo.appType as AppType,
    requiresAuth: basicInfo.requiresAuth,
    domains,
  };

  // Generate and write files
  console.log("");

  const cwd = process.cwd();
  const playwrightDir = join(cwd, "playwright");
  const testsDir = join(playwrightDir, "tests");

  // Create directories if they don't exist
  if (!existsSync(testsDir)) {
    mkdirSync(testsDir, { recursive: true });
  }

  const files: Array<{ path: string; content: string; name: string }> = [
    {
      path: join(playwrightDir, "app.config.ts"),
      content: generateAppConfig(options),
      name: "playwright/app.config.ts",
    },
    {
      path: join(playwrightDir, "testUsers.ts"),
      content: generateTestUsers(options),
      name: "playwright/testUsers.ts",
    },
    {
      path: join(playwrightDir, "playwright.config.ts"),
      content: generatePlaywrightConfig(options),
      name: "playwright/playwright.config.ts",
    },
    {
      path: join(playwrightDir, "tsconfig.json"),
      content: generateTsConfig(),
      name: "playwright/tsconfig.json",
    },
    {
      path: join(playwrightDir, ".gitignore"),
      content: generateGitignore(),
      name: "playwright/.gitignore",
    },
    {
      path: join(testsDir, "example.spec.ts"),
      content: generateExampleSpec(options),
      name: "playwright/tests/example.spec.ts",
    },
  ];

  for (const file of files) {
    if (existsSync(file.path)) {
      const { overwrite } = await prompts({
        type: "confirm",
        name: "overwrite",
        message: `${file.name} already exists. Overwrite?`,
        initial: false,
      });

      if (!overwrite) {
        console.log(`  Skipped ${file.name}`);
        continue;
      }
    }

    writeFileSync(file.path, file.content, "utf-8");
    console.log(`  \u2713 Created ${file.name}`);
  }

  // Print package.json instructions
  const instructions = getPackageJsonInstructions();
  console.log(formatPackageJsonInstructions(instructions));
}
