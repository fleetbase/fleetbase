#!/usr/bin/env node
// Fails (exit 1) if total coverage is below the threshold.
// Reads coverage/coverage-summary.json produced by ember-cli-code-coverage
// (json-summary reporter). Run after `pnpm test:ember:coverage`.
//
// Usage:
//   node scripts/coverage-check.mjs [--fail-under=100]
//
// Mirrors the backend packages' scripts/coverage-summary.php --fail-under gate
// so the console holds the same 100% bar once its suite reaches it.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const summaryPath = resolve(__dirname, '..', 'coverage', 'coverage-summary.json');

const failUnderArg = process.argv.find((a) => a.startsWith('--fail-under='));
const failUnder = failUnderArg ? parseFloat(failUnderArg.split('=')[1]) : 100;

let summary;
try {
  summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
} catch (err) {
  console.error(`✖ Could not read coverage summary at ${summaryPath}.`);
  console.error('  Run `pnpm test:ember:coverage` first (COVERAGE=true).');
  console.error(`  ${err.message}`);
  process.exit(1);
}

const total = summary.total;
const metrics = ['lines', 'statements', 'functions', 'branches'];
let failed = false;

console.log(`Coverage summary (threshold: ${failUnder}%)`);
for (const metric of metrics) {
  const pct = total?.[metric]?.pct ?? 0;
  const ok = pct >= failUnder;
  console.log(`  ${ok ? '✔' : '✖'} ${metric.padEnd(11)} ${pct}%`);
  if (!ok) failed = true;
}

if (failed) {
  console.error(`\n✖ Coverage is below ${failUnder}%.`);
  process.exit(1);
}
console.log(`\n✔ Coverage meets the ${failUnder}% threshold.`);
