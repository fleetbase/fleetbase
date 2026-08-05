'use strict';

// Configuration for ember-cli-code-coverage.
// Coverage is only instrumented when the COVERAGE env var is truthy
// (e.g. `COVERAGE=true ember test` / `pnpm test:ember:coverage`), so it never
// slows down normal `ember test` runs.
//
// Reporters:
//   - lcov          → coverage/lcov.info   (uploaded to Codecov)
//   - json-summary  → coverage/coverage-summary.json (read by scripts/coverage-check.mjs)
//   - text-summary  → printed to the console
module.exports = {
  coverageEnvVar: 'COVERAGE',
  reporters: ['lcov', 'json-summary', 'text-summary'],
  // Exclude generated/vendor and test files from the coverage denominator.
  // app/extensions/** are auto-generated extension manifests (declarative config
  // written by the extensions generator) — not hand-written, testable logic.
  excludes: ['*/mirage/**', '*/tests/**', '**/*-test.js', '**/extensions/**'],
};
