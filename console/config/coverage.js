'use strict';

const path = require('path');

// Configuration for ember-cli-code-coverage.
// Coverage is only instrumented when the COVERAGE env var is truthy
// (e.g. `COVERAGE=true ember test` / `pnpm test:ember:coverage`), so it never
// slows down normal `ember test` runs.
//
// Reporters:
//   - lcov          → coverage/lcov.info   (uploaded to Codecov)
//   - json-summary  → coverage/coverage-summary.json (read by scripts/coverage-check.mjs)
//   - text-summary  → printed to the console
//
// NOTE: instrumentation also requires ember-cli-build.js to spread
// `require('ember-cli-code-coverage').buildBabelPlugin()` into its babel plugins, and
// tests/test-helper.js to post window.__coverage__ on QUnit.done. The addon does neither
// automatically.

// This app's modulePrefix is scoped ('@fleetbase/console'), which the addon does not
// handle: adjustCoverageKey() takes only the FIRST path segment as the namespace
// ('@fleetbase'), so it never matches the mapping registered under the full prefix. Every
// file then resolves to <root>/@fleetbase/console/... , fails the addon's
// "does this file exist in the project" check, and is dropped — yielding an empty report
// with 0 files and "Unknown" percentages. modifyAssetLocation is the supported hook for
// correcting the path; map the scoped prefix back onto app/.
const MODULE_PREFIX = '@fleetbase/console/';

module.exports = {
    coverageEnvVar: 'COVERAGE',
    // `json` emits coverage/coverage-final.json, which carries the statement, branch and
    // function maps. That detail is what makes it possible to tell a genuinely untested
    // line from an instrumentation artifact when chasing the last few percent.
    reporters: ['lcov', 'json', 'json-summary', 'text-summary'],
    // Exclude generated/vendor and test files from the coverage denominator.
    // app/extensions/** are auto-generated extension manifests (declarative config
    // written by the extensions generator) — not hand-written, testable logic.
    excludes: ['*/mirage/**', '*/tests/**', '**/*-test.js', '**/extensions/**'],

    modifyAssetLocation(root, relativePath) {
        if (relativePath.startsWith(MODULE_PREFIX)) {
            return path.join(root, 'app', relativePath.slice(MODULE_PREFIX.length));
        }

        return undefined;
    },
};
