#!/usr/bin/env node
/**
 * zip-folder.js
 *
 * Zips a directory, skipping ignored folders/files at ANY depth
 * (so "node_modules" matches both ./node_modules and ./backend/node_modules).
 *
 * Usage:
 *   node zip-folder.js <sourceDir> <outputZipPath>
 *   node zip-folder.js . build/project.zip
 *
 *   npm run zip -- . build/project.zip
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Add more names here anytime — matched against each path segment, at any depth.
const IGNORE_NAMES = ['node_modules', 'dist', '.git'];

// Reads a .gitignore in rootDir and pulls out simple plain-name entries
// (no wildcards, no nested paths) to merge into the ignore list.
// Anything with "*", "/" in the middle, or "!" is skipped since that needs
// real glob matching, which this script intentionally doesn't do.
function loadGitignoreIgnores(rootDir) {
  const ignores = new Set();
  const gitignorePath = path.join(rootDir, '.gitignore');

  if (!fs.existsSync(gitignorePath)) return ignores;

  const lines = fs.readFileSync(gitignorePath, 'utf8').split('\n');
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    if (line.includes('*')) continue; // skip glob patterns
    const cleaned = line.replace(/\/$/, ''); // drop trailing slash
    if (cleaned.includes('/')) continue; // skip nested paths, just plain names
    ignores.add(cleaned);
  }
  return ignores;
}

function shouldIgnore(relativePath, ignoreSet) {
  const segments = relativePath.split(path.sep);
  return segments.some((seg) => ignoreSet.has(seg));
}

function zipFolder(sourceDir, outputPath, extraIgnores = []) {
  const ignoreSet = new Set([
    ...IGNORE_NAMES,
    ...extraIgnores,
    ...loadGitignoreIgnores(sourceDir),
  ]);

  // make sure the output directory exists
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', reject);
    archive.pipe(output);

    function addDir(dir, relBase = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const relPath = path.join(relBase, entry.name);
        if (shouldIgnore(relPath, ignoreSet)) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          addDir(fullPath, relPath);
        } else if (entry.isFile()) {
          archive.file(fullPath, { name: relPath });
        }
      }
    }

    addDir(sourceDir);
    archive.finalize();
  });
}

// --- CLI entry point ---
if (require.main === module) {
  const sourceDir = process.argv[2] || '.';
  const outputPath = process.argv[3] || 'output.zip';

  zipFolder(sourceDir, outputPath)
    .then((bytes) => console.log(`Zipped ${bytes} bytes -> ${outputPath}`))
    .catch((err) => {
      console.error('Failed to zip:', err);
      process.exit(1);
    });
}

module.exports = { zipFolder, IGNORE_NAMES };
