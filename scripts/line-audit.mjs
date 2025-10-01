/**
 * Why: Provide a quick audit for oversized source files so we can keep modules within the 300–500 LOC guideline.
 * What: Recursively scans the repository (excluding ignored directories) and reports files exceeding the configured line threshold.
 * How: Walks the directory tree, counts lines for supported file extensions, emits a sorted table, and optionally fails the process when violations occur.
 * Contract
 *   Inputs:
 *     - CLI args: [--max <number>] to override the line ceiling, [--fail] to exit with code 1 when violations exist, [--json] for machine-readable output.
 *   Outputs:
 *     - Prints a report to stdout; returns exitCode 0 on success unless --fail with violations.
 *   Error modes:
 *     - Propagates filesystem errors with context; exits 2 when CLI arguments are invalid.
 *   Performance:
 *     - time: linear over number of files; memory: buffers one file at a time (<1 MB typical).
 *   Side effects:
 *     - Reads files from disk only.
 */

import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_THRESHOLD = 500;
const SUPPORTED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.py',
  '.yml',
  '.yaml',
  '.css',
  '.scss',
]);
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.github',
  '.vscode',
  'node_modules',
  'coverage',
  'dist',
  'build',
  'tmp',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.DS_Store',
]);

function parseArgs(argv) {
  const args = { max: DEFAULT_THRESHOLD, fail: false, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--max') {
      const value = argv[i + 1];
      if (!value || Number.isNaN(Number(value))) {
        throw Object.assign(new Error('Invalid value for --max. Provide a positive integer.'), { code: 'EINVAL' });
      }
      args.max = Number(value);
      i += 1;
    } else if (token === '--fail') {
      args.fail = true;
    } else if (token === '--json') {
      args.json = true;
    } else {
      throw Object.assign(new Error(`Unknown argument: ${token}`), { code: 'EINVAL' });
    }
  }
  if (args.max <= 0) {
    throw Object.assign(new Error('--max must be greater than zero.'), { code: 'EINVAL' });
  }
  return args;
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      const nested = await walk(entryPath);
      files.push(...nested);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (SUPPORTED_EXTENSIONS.has(ext)) files.push(entryPath);
    }
  }
  return files;
}

async function countLines(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

function toRelative(filePath) {
  return path.relative(ROOT_DIR, filePath) || path.basename(filePath);
}

function formatTable(rows) {
  const maxPathLength = rows.reduce((acc, row) => Math.max(acc, row.path.length), 0);
  const headerPath = 'File'.padEnd(maxPathLength, ' ');
  const header = `${headerPath}  Lines`;
  const entries = rows.map((row) => `${row.path.padEnd(maxPathLength, ' ')}  ${row.lines}`);
  return [header, ...entries].join('\n');
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[line-audit] Argument error: ${error.message}`);
    process.exitCode = 2;
    return;
  }

  const files = await walk(ROOT_DIR);
  const results = [];

  for (const file of files) {
    try {
      const lines = await countLines(file);
      if (lines > args.max) {
        results.push({ path: toRelative(file), lines });
      }
    } catch (error) {
      console.error(`[line-audit] Failed to read ${file}: ${error.message}`);
    }
  }

  results.sort((a, b) => b.lines - a.lines);

  if (args.json) {
    console.log(JSON.stringify({ max: args.max, violations: results }, null, 2));
  } else if (results.length > 0) {
    console.log(formatTable(results));
    console.log(`\n${results.length} file(s) exceed ${args.max} lines.`);
  } else {
    console.log(`All scanned files are within ${args.max} lines.`);
  }

  if (args.fail && results.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[line-audit] Unexpected failure: ${error.message}`);
  process.exitCode = 1;
});
