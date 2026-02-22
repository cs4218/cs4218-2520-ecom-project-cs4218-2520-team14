import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["**/node_modules/**", "**/_site/**", "**/coverage/**", "**/build/**", "**/dist/**", "**/playwright-report/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    ignores: ["node_modules/**"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.jest },
    },
    plugins: { js, react: pluginReact },
    extends: ["js/recommended", pluginReact.configs.flat.recommended],
    rules: {
      "react/react-in-jsx-scope": "off",
    },
  },
]);
