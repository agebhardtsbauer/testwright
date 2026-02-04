import { defineConfig } from "tsup";

export default defineConfig([
  // Library build
  {
    entry: {
      index: "src/index.ts",
      "config/index": "src/config/index.ts",
      "reporter/index": "src/reporter/index.ts",
      "helpers/index": "src/helpers/index.ts",
      "fixtures/index": "src/fixtures/index.ts",
    },
    format: ["cjs", "esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    minify: false,
    target: "node18",
    outDir: "dist",
  },
  // CLI build
  {
    entry: { "cli/index": "src/cli/index.ts" },
    format: ["esm"],
    dts: false,
    splitting: false,
    sourcemap: false,
    clean: false,
    treeshake: true,
    minify: false,
    target: "node18",
    outDir: "dist",
    banner: { js: "#!/usr/bin/env node" },
  },
]);
