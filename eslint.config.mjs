import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // React Compiler rules ship in the recommended preset of
  // eslint-plugin-react-hooks v7+. Flags components the compiler can't
  // optimize so we know when to refactor or `'use no memo'`.
  reactHooks.configs.flat["recommended-latest"],
  {
    rules: {
      // Bootstrap-on-mount patterns (read DOM/localStorage post-mount, or
      // kick off fetches) are common and intentional. Keep as a warning so
      // we still see new instances without breaking CI.
      "react-hooks/set-state-in-effect": "warn",
      // False-positive prone for `let` accumulators inside async loops
      // closed over by the component. Keep as warn.
      "react-hooks/immutability": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Exercise scaffolds intentionally have unused params for the
    // candidate to fill in.
    "content/exercises/**/starter.*",
    "content/exercises/**/tests.*",
  ]),
]);

export default eslintConfig;
