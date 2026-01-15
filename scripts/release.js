#!/usr/bin/env node

/**
 * Release script for versioning and publishing the extension.
 *
 * Usage: npm run release [patch|minor|major]
 *
 * This script:
 * 1. Bumps version in manifest.json and package.json
 * 2. Updates CHANGELOG.md with new version header
 * 3. Builds the extension zip
 * 4. Creates a git commit and tag
 * 5. Optionally uploads to Chrome Web Store
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function updateChangelog(version) {
  const changelogPath = join(rootDir, 'CHANGELOG.md');
  let changelog = readFileSync(changelogPath, 'utf8');

  const today = new Date().toISOString().split('T')[0];
  const unreleasedHeader = '## [Unreleased]';
  const newVersionHeader = `## [${version}] - ${today}`;

  if (changelog.includes(unreleasedHeader)) {
    // Add new unreleased section and mark current as released
    changelog = changelog.replace(
      unreleasedHeader,
      `${unreleasedHeader}\n\n${newVersionHeader}`,
    );
  } else {
    // Insert after the header
    const insertPoint = changelog.indexOf('\n## ');
    if (insertPoint > 0) {
      changelog = changelog.slice(0, insertPoint) +
        `\n\n${unreleasedHeader}\n\n${newVersionHeader}` +
        changelog.slice(insertPoint + 1);
    }
  }

  writeFileSync(changelogPath, changelog);
  console.log(`📝 Updated CHANGELOG.md with version ${version}`);
}

function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { cwd: rootDir, encoding: 'utf8', ...options });
}

function main() {
  const args = process.argv.slice(2);
  const bumpType = args[0] || 'patch';
  const shouldUpload = args.includes('--upload');
  const shouldPublish = args.includes('--publish');

  if (!['patch', 'minor', 'major'].includes(bumpType)) {
    console.error('Usage: npm run release [patch|minor|major] [--upload] [--publish]');
    process.exit(1);
  }

  // Check for uncommitted changes
  try {
    const status = run('git status --porcelain', { stdio: 'pipe' });
    if (status.trim()) {
      console.error('❌ Error: Working directory has uncommitted changes');
      console.error('   Commit or stash your changes before releasing.');
      process.exit(1);
    }
  } catch {
    console.warn('⚠️  Not a git repository or git not available');
  }

  // Read current versions
  const manifestPath = join(rootDir, 'manifest.json');
  const packagePath = join(rootDir, 'package.json');

  const manifest = readJson(manifestPath);
  const pkg = readJson(packagePath);

  const oldVersion = manifest.version;
  const newVersion = bumpVersion(oldVersion, bumpType);

  console.log(`\n🚀 Releasing version ${oldVersion} → ${newVersion}\n`);

  // Update versions
  manifest.version = newVersion;
  pkg.version = newVersion;

  writeJson(manifestPath, manifest);
  console.log('📦 Updated manifest.json');

  writeJson(packagePath, pkg);
  console.log('📦 Updated package.json');

  // Update changelog
  updateChangelog(newVersion);

  // Run lint
  console.log('\n🔍 Running lint...');
  try {
    run('npm run lint');
  } catch {
    console.error('❌ Lint failed. Fix errors before releasing.');
    process.exit(1);
  }

  // Build extension
  console.log('\n🔨 Building extension...');
  run('npm run build');

  // Git commit and tag
  console.log('\n📝 Creating git commit and tag...');
  try {
    run('git add manifest.json package.json CHANGELOG.md');
    run(`git commit -m "chore: release v${newVersion}"`);
    run(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
    console.log(`✅ Created commit and tag v${newVersion}`);
  } catch (error) {
    console.warn('⚠️  Git operations failed:', error.message);
  }

  // Upload to Chrome Web Store
  if (shouldUpload || shouldPublish) {
    console.log('\n📤 Uploading to Chrome Web Store...');
    try {
      // Load .env file
      const envPath = join(rootDir, '.env');
      const envContent = readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && !key.startsWith('#')) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      });

      const uploadCmd = shouldPublish ? 'npm run publish' : 'npm run upload';
      run(uploadCmd, { stdio: 'inherit' });
      console.log('✅ Uploaded to Chrome Web Store');
    } catch (error) {
      console.error('❌ Upload failed:', error.message);
      console.error('   Make sure .env file exists with valid credentials');
      process.exit(1);
    }
  }

  console.log(`\n🎉 Released v${newVersion}!`);
  console.log('\nNext steps:');
  console.log('  git push origin main --tags');
  if (!shouldUpload && !shouldPublish) {
    console.log('  npm run upload    # Upload to Chrome Web Store (draft)');
    console.log('  npm run publish   # Upload and publish immediately');
  }
}

main();
