// ESLint 9 flat config — first-party Expo ruleset (React Native/Expo-aware,
// includes react-hooks + import rules). Run with `npm run lint`.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Build output + Convex-generated bindings are not ours to lint.
    ignores: ["dist/*", ".expo/*", "node_modules/*", "convex/_generated/*"],
  },
]);
