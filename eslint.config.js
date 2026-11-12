import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tsEslint from "typescript-eslint";

/**
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  js.configs.recommended,
  tsEslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
      "no-alert": "warn",
      "no-console": "warn",
      "no-constant-condition": "error",
      "no-debugger": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "use-isnan": "error",
      eqeqeq: ["error", "smart"],
      "no-eval": "error",
      "no-floating-decimal": "error",
      "no-new": "error",
      "no-return-assign": "error",
      "no-self-compare": "error",
      "no-undef-init": "error",
      "no-var": "error",
      "no-unused-vars": "error",
      "comma-dangle": ["error", "always-multiline"],
      "comma-spacing": ["error", { before: false, after: true }],
      "comma-style": ["error", "last"],
      "new-parens": "error",
      "no-multiple-empty-lines": ["error", { max: 2, maxEOF: 1 }],
      quotes: ["error", "double", { avoidEscape: true }],
    },
  },
  {
    ignores: ["**/dist/**"],
  },
  eslintConfigPrettier,
];
