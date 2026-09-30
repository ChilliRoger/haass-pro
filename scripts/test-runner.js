#!/usr/bin/env node
/**
 * test-runner.js
 *
 * Cross-platform test runner for haass-weather-travel middleware.
 * Discovers and passes explicit test file paths to node --test, avoiding
 * directory-resolution differences across operating systems (POSIX / Windows)
 * and Node.js versions.
 *
 * Usage:
 *   node scripts/test-runner.js [unit|live]
 */

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const middlewareDir = resolve(repoRoot, 'middleware');

const suite = process.argv[2] || 'unit';

if (suite !== 'unit' && suite !== 'live') {
  console.error(`Invalid test suite "${suite}". Must be "unit" or "live".`);
  process.exit(1);
}

const testDir = resolve(middlewareDir, 'test', suite);

/**
 * Recursively collects all *.test.js files within a directory.
 * @param {string} dir
 * @returns {string[]}
 */
function collectTestFiles(dir) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
    } else if (entry.name.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

const absoluteFiles = collectTestFiles(testDir);

if (absoluteFiles.length === 0) {
  console.error(`No test files found in ${testDir}`);
  process.exit(1);
}

const relativeFiles = absoluteFiles.map((file) => relative(middlewareDir, file));

const args = [];

if (suite === 'unit') {
  args.push('--experimental-test-coverage');
}

args.push('--test', ...relativeFiles);

const result = spawnSync(process.execPath, args, {
  cwd: middlewareDir,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? (result.error ? 1 : 0));
