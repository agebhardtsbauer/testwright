import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Include only unit tests
    include: ["__tests__/**/*.test.ts"],
    // Exclude Playwright tests (they run with playwright test)
    exclude: ["playwright/**", "node_modules/**"],
    // Enable globals for cleaner test syntax
    globals: false,
    // Use native Node.js modules
    environment: "node",
  },
});
