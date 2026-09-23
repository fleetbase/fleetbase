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

import { existsSync, readFileSync } from 'node:fs';
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
  reportShortfalls();
  console.error(`\n✖ Coverage is below ${failUnder}%.`);
  process.exit(1);
}
console.log(`\n✔ Coverage meets the ${failUnder}% threshold.`);

/**
 * Say WHERE coverage falls short, not just by how much: every file under the threshold,
 * and when coverage-final.json is present, the lines of each uncovered statement,
 * function and branch. Without this the CI log shows only totals.
 */
function reportShortfalls() {
  // A metric with nothing to count (an empty module) is never a shortfall.
  const shortOn = (file, metric) => (file?.[metric]?.total ?? 0) > 0 && (file[metric].pct ?? 100) < failUnder;
  const files = Object.entries(summary)
    .filter(([name]) => name !== 'total')
    .filter(([, file]) => metrics.some((metric) => shortOn(file, metric)));

  if (files.length === 0) {
    return;
  }

  const finalPath = resolve(__dirname, '..', 'coverage', 'coverage-final.json');
  let detail = {};
  if (existsSync(finalPath)) {
    try {
      detail = JSON.parse(readFileSync(finalPath, 'utf8'));
    } catch {
      detail = {};
    }
  }

  const lineOf = (location) => location?.start?.line;

  console.error(`\nFiles below ${failUnder}%:`);
  for (const [name, file] of files) {
    const shortfalls = metrics
      .filter((metric) => shortOn(file, metric))
      .map((metric) => `${metric} ${file[metric].covered}/${file[metric].total}`)
      .join(', ');
    console.error(`  ${relativeName(name)}  (${shortfalls})`);

    const coverage = detail[name];
    if (!coverage) {
      continue;
    }

    const statements = Object.entries(coverage.s ?? {})
      .filter(([, hits]) => hits === 0)
      .map(([id]) => lineOf(coverage.statementMap[id]));
    const functions = Object.entries(coverage.f ?? {})
      .filter(([, hits]) => hits === 0)
      .map(([id]) => lineOf(coverage.fnMap[id]?.loc));
    const branches = Object.entries(coverage.b ?? {}).flatMap(([id, hits]) => {
      const branch = coverage.branchMap[id];
      return hits.flatMap((count, index) => (count === 0 ? [`${lineOf(branch.locations?.[index]) ?? lineOf(branch.loc)} (${branch.type})`] : []));
    });

    for (const [label, lines] of [
      ['statements', statements],
      ['functions', functions],
      ['branches', branches],
    ]) {
      if (lines.length > 0) {
        console.error(`      uncovered ${label} at line ${[...new Set(lines)].join(', ')}`);
      }
    }
  }
}

function relativeName(name) {
  const marker = '/app/';
  const index = name.lastIndexOf(marker);
  return index === -1 ? name : `app/${name.slice(index + marker.length)}`;
}
