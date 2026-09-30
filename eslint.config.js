// eslint.config.js - haass-weather-travel
// ESLint flat config (ESLint 9+, Node.js 24)
import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";

export default [
  js.configs.recommended,
  prettierConfig,
  {
    files: ["middleware/src/**/*.js", "middleware/test/**/*.js", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        // Node.js 24 globals
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        fetch: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
      },
    },
    rules: {
      // Errors
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "error",
      "no-debugger": "error",
      "no-var": "error",

      // Code quality
      "prefer-const": "error",
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],
      "no-throw-literal": "error",
      "no-return-await": "error",
      "require-await": "error",

      // Style (Prettier handles formatting; these are logic rules only)
      "no-multiple-empty-lines": ["error", { max: 1 }],
      "no-trailing-spaces": "error",
    },
  },
  {
    // Test files may use test-only globals
    files: ["middleware/test/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        before: "readonly",
        after: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
    rules: {
      // Tests may assert on things that look like no-ops to the linter
      "no-unused-expressions": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      "middleware/node_modules/**",
      "coverage/**",
      "middleware/coverage/**",
      "dist/**",
      "build/**",
    ],
  },
];
