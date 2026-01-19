#!/usr/bin/env node

/**
 * Build script for creating Chrome extension zip package.
 *
 * Usage: npm run build
 *
 * Creates dist/extension.zip ready for Chrome Web Store upload.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const zipPath = join(distDir, 'extension.zip');

// Files and directories to include in the extension
const INCLUDE_PATTERNS = [
  'manifest.json',
  '*.html',
  '*.js',
  'images/',
  'modules/',
  'content-scripts/',
];

// Files and directories to exclude
const EXCLUDE_PATTERNS = [
  '*.git*',
  'node_modules/*',
  'scripts/*',
  'dist/*',
  '.env*',
  '*.md',
  'package*.json',
  'eslint.config.js',
  '.github/*',
];

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
}

function main() {
  console.log('🔨 Building Chrome extension...\n');

  // Read version from manifest
  const manifest = JSON.parse(readFileSync(join(rootDir, 'manifest.json'), 'utf8'));
  console.log(`📦 Version: ${manifest.version}`);
  console.log(`📛 Name: ${manifest.name}\n`);

  // Clean and create dist directory
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true });
  }
  mkdirSync(distDir, { recursive: true });

  // Build zip command
  const includes = INCLUDE_PATTERNS.join(' ');
  const excludes = EXCLUDE_PATTERNS.map(p => `-x "${p}"`).join(' ');

  run(`zip -r "${zipPath}" ${includes} ${excludes}`);

  console.log('\n✅ Built: dist/extension.zip');
  console.log(`   Size: ${(existsSync(zipPath) ? readFileSync(zipPath).length / 1024 : 0).toFixed(1)} KB`);
}

main();
