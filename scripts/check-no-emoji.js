#!/usr/bin/env node
/**
 * check-no-emoji.js
 *
 * Scans all tracked git files for emoji characters and non-ASCII pictographic
 * symbols. Exits with code 1 if any are found, so CI fails on violation.
 *
 * Usage:
 *   node scripts/check-no-emoji.js
 *
 * The script uses `git ls-files` to enumerate only tracked files, so it
 * respects .gitignore automatically.
 *
 * Detection: the Unicode Emoji property covers the main emoji ranges.
 * We additionally check for Miscellaneous Symbols and other pictographic
 * blocks that are not classified as Emoji by the property alone.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Regex matching Unicode emoji and pictographic characters. */
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B00}-\u{2BFF}]|[\u{FE00}-\u{FE0F}]|[\u{1FA00}-\u{1FAFF}]/u;

/**
 * Binary file signatures (magic bytes). Files matching these are skipped.
 * We check only the first 8 bytes.
 */
const BINARY_SIGNATURES = [
  [0x89, 0x50, 0x4e, 0x47], // PNG
  [0xff, 0xd8, 0xff], // JPEG
  [0x47, 0x49, 0x46], // GIF
  [0x25, 0x50, 0x44, 0x46], // PDF
  [0x50, 0x4b, 0x03, 0x04], // ZIP/DOCX/XLSX
  [0x1f, 0x8b], // gzip
];

/**
 * Returns true if the buffer begins with a known binary signature.
 * @param {Buffer} buf - File buffer (first bytes only).
 * @returns {boolean}
 */
function isBinary(buf) {
  for (const sig of BINARY_SIGNATURES) {
    if (sig.every((byte, i) => buf[i] === byte)) {
      return true;
    }
  }
  // Heuristic: if more than 10% of the first 512 bytes are null, treat as binary.
  const sample = buf.subarray(0, 512);
  const nullCount = [...sample].filter((b) => b === 0).length;
  return nullCount / sample.length > 0.1;
}

/**
 * Returns the list of tracked files from git.
 * @returns {string[]}
 */
function getTrackedFiles() {
  const output = execSync('git ls-files', { encoding: 'utf8' });
  return output.split('\n').filter(Boolean);
}

const violations = [];
const repoRoot = process.cwd();
const files = getTrackedFiles();

for (const relativePath of files) {
  const fullPath = join(repoRoot, relativePath);
  let buf;
  try {
    buf = readFileSync(fullPath);
  } catch {
    // File may have been deleted between ls-files and now - skip.
    continue;
  }

  if (isBinary(buf)) {
    continue;
  }

  const text = buf.toString('utf8');
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (EMOJI_REGEX.test(lines[i])) {
      violations.push({ file: relativePath, line: i + 1, content: lines[i].trim() });
    }
  }
}

if (violations.length > 0) {
  process.stderr.write('No-emoji check FAILED. Emoji or pictographic characters found:\n\n');
  for (const v of violations) {
    process.stderr.write(`  ${v.file}:${v.line}  ${v.content}\n`);
  }
  process.stderr.write(
    '\nRemove all emoji and decorative Unicode symbols. Plain ASCII text only.\n',
  );
  process.exit(1);
}

process.stdout.write('No-emoji check passed. No emoji found in tracked files.\n');
