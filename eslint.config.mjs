import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Run Prettier as an ESLint rule so `eslint --fix` also formats the code.
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "error",
    },
  },
  // Disable any next/TS rules that conflict with Prettier's formatting.
  // Must come AFTER the plugin rule so conflicts are turned off last.
  prettierConfig,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test files are not shipped; skip the Next app lint rules (avoids
    // flagging describe/it/expect globals) and keep them out of the bundle.
    "**/*.test.{ts,tsx}",
    "vitest.config.ts",
    "vitest.setup.ts",
  ]),
]);

export default eslintConfig;
