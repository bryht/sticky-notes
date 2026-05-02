#!/usr/bin/env node
/**
 * Build script for Sticky Notes Chrome Extension
 * Uses esbuild to bundle ES modules into a single contentScript.js IIFE
 * for Chrome MV3 content_scripts compatibility.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const esbuild = require('esbuild');

const ROOT = __dirname;
const BUILD_DIR = path.join(ROOT, 'build');
const TEMP_DIR = path.join(ROOT, 'temp_zip_dir');

async function bundleContentScript() {
  console.log('🔨 Bundling content.js → contentScript.js with esbuild...\n');

  await esbuild.build({
    entryPoints: [path.join(ROOT, 'content.js')],
    bundle: true,
    format: 'iife',
    target: 'chrome88',
    outfile: path.join(TEMP_DIR, 'contentScript.js'),
    external: ['chrome:*'],
    // Mark chrome.* as external — these are provided by the browser runtime
    banner: {
      js: '// Sticky Notes Extension - Bundled by esbuild for Chrome MV3 compatibility\n'
    },
    logLevel: 'info',
  });

  console.log('✅ Bundled contentScript.js created');
}

async function packageExtension() {
  console.log('📦 Packaging extension...\n');

  // Clean
  if (fs.existsSync(BUILD_DIR)) fs.rmSync(BUILD_DIR, { recursive: true });
  if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true });
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  // Build the bundled content script first
  await bundleContentScript();

  // Copy all necessary files
  const filesToCopy = ['background.js', 'styles.css'];
  for (const f of filesToCopy) {
    fs.copyFileSync(path.join(ROOT, f), path.join(TEMP_DIR, f));
  }

  // Copy icons directory
  fs.cpSync(path.join(ROOT, 'icons'), path.join(TEMP_DIR, 'icons'), { recursive: true });

  // Update manifest: point content_scripts to the bundled contentScript.js
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  const version = manifest.version;

  const buildManifest = { ...manifest };
  buildManifest.content_scripts[0].js = ['contentScript.js'];
  fs.writeFileSync(path.join(TEMP_DIR, 'manifest.json'), JSON.stringify(buildManifest, null, 2));

  // Create zip using Python (always available) since 'zip' may not be installed
  const zipName = `sticky-notes-v${version}.zip`;
  const buildDir = path.join(ROOT, 'build');
  const zipPath = path.join(buildDir, zipName);

  // Python zip using absolute path (escape single quotes in path)
  const zipPathEsc = zipPath.replace(/'/g, "'\\''");
  const tempDirEsc = TEMP_DIR.replace(/'/g, "'\\''");

  try {
    execSync(`cd '${tempDirEsc}' && python3 -c "
import zipfile, os
with zipfile.ZipFile('${zipPathEsc}', 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('.'):
        for f in files:
            fp = os.path.join(root, f)
            zf.write(fp)
"`, { stdio: 'pipe' });
  } catch (e) {
    console.error('Failed to create zip with Python:', e.message);
    // Fallback: try zip command
    console.error('Trying zip command as fallback...');
    try {
      execSync(`cd '${tempDirEsc}' && zip -r '${zipPathEsc}' .`, { stdio: 'pipe' });
    } catch (e2) {
      console.error('Both zip methods failed. Cannot create package.');
      throw e2;
    }
  }

  // Clean up temp dir
  fs.rmSync(TEMP_DIR, { recursive: true });

  console.log(`\n✅ Build complete: ${BUILD_DIR}/${zipName}`);
  console.log(`   Version: ${version}`);

  // List build output
  const stats = fs.statSync(zipPath);
  console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);
}

// Run
packageExtension().catch(err => {
  console.error('❌ Build failed:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});