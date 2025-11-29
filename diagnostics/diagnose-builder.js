import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const colors = {
  reset: '\u001b[0m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
};

const headerLine = '---------------------------------------------';

const requiredDirs = [
  'theme-builder/index.html',
  'theme-builder/js',
  'theme-builder/css',
  'assets/construction-theme',
  'assets/constuction-theme',
  'visual-assets/.gitignore',
  'generate-assets.js',
  'tests',
  'postinstall.js',
];

const requiredModules = [
  'canvasEngine.js',
  'layerManager.js',
  'assetScanner.js',
  'filters.js',
  'transforms.js',
  'behaviors.js',
  'snapEngine.js',
  'componentFactory.js',
  'inspector.js',
  'exportTools.js',
  'spacingBlocks.js',
  'colorBuckets.js',
  'typeBlocks.js',
];

function logStatus(passed, message) {
  const symbol = passed ? `${colors.green}\u2713${colors.reset}` : `${colors.red}\u2717${colors.reset}`;
  console.log(`${symbol} ${message}`);
}

function isBinaryBuffer(buffer) {
  if (!buffer || buffer.length === 0) return false;
  let suspicious = 0;
  for (const byte of buffer) {
    if (byte === 9 || byte === 10 || byte === 13) continue;
    if (byte >= 32 && byte <= 126) continue;
    suspicious += 1;
    if (suspicious > 3) return true;
  }
  return false;
}

async function fileExists(relPath) {
  try {
    await fs.access(path.join(root, relPath));
    return true;
  } catch {
    return false;
  }
}

async function validateDirectories(failures) {
  for (const relPath of requiredDirs) {
    const exists = await fileExists(relPath);
    if (exists) {
      logStatus(true, `Path present: ${relPath}`);
    } else {
      failures.push(`Missing path: ${relPath}`);
      logStatus(false, `Missing path: ${relPath}`);
    }
  }
}

async function ensureTextOnly(filePath) {
  const buffer = await fs.readFile(filePath);
  return !isBinaryBuffer(buffer);
}

function ensureBtoa() {
  if (typeof globalThis.btoa !== 'function') {
    globalThis.btoa = (str) => Buffer.from(str, 'utf8').toString('base64');
  }
}

async function validateModules(failures) {
  ensureBtoa();
  for (const mod of requiredModules) {
    const relPath = path.join('theme-builder', 'js', mod);
    const absPath = path.join(root, relPath);
    const exists = await fileExists(relPath);
    if (!exists) {
      failures.push(`Missing module: ${mod}`);
      logStatus(false, `Missing module: ${mod}`);
      continue;
    }

    const textOnly = await ensureTextOnly(absPath);
    if (!textOnly) {
      failures.push(`Binary content detected in module: ${mod}`);
      logStatus(false, `Binary content detected in module: ${mod}`);
      continue;
    }

    try {
      const imported = await import(pathToFileURL(absPath).href);
      const exportedValues = Object.values(imported);
      const hasFunction = exportedValues.some((value) => typeof value === 'function');
      if (!hasFunction) {
        failures.push(`No exported functions in module: ${mod}`);
        logStatus(false, `No exported functions in module: ${mod}`);
        continue;
      }
      logStatus(true, `Module OK: ${mod}`);
    } catch (err) {
      failures.push(`Failed to import module ${mod}: ${err.message}`);
      logStatus(false, `Failed to import module ${mod}: ${err.message}`);
    }
  }
}

async function validateThemeIntegrity(failures) {
  const cssDir = path.join(root, 'theme-builder', 'css');
  try {
    const cssFiles = await fs.readdir(cssDir);
    if (cssFiles.some((file) => file.endsWith('.css'))) {
      logStatus(true, 'CSS directory populated');
    } else {
      failures.push('No CSS files found in theme-builder/css');
      logStatus(false, 'No CSS files found in theme-builder/css');
    }
  } catch (err) {
    failures.push(`Unable to read CSS directory: ${err.message}`);
    logStatus(false, `Unable to read CSS directory: ${err.message}`);
  }

  const assetDir = path.join(root, 'theme-builder', 'assets');
  try {
    const assetFiles = await fs.readdir(assetDir);
    if (assetFiles.length > 0) {
      logStatus(true, 'Base assets available');
    } else {
      failures.push('No base assets found in theme-builder/assets');
      logStatus(false, 'No base assets found in theme-builder/assets');
    }
  } catch (err) {
    failures.push(`Unable to read theme assets: ${err.message}`);
    logStatus(false, `Unable to read theme assets: ${err.message}`);
  }

  const visualAssetDirs = [path.join(root, 'visual-assets'), path.join(root, 'theme-builder', 'visual-assets')];
  for (const dir of visualAssetDirs) {
    const exists = await fileExists(path.relative(root, dir));
    if (!exists) continue;
    const files = await fs.readdir(dir);
    const leaks = files.filter((file) => file.match(/\.(png|jpg|jpeg|svg|gif)$/i));
    if (leaks.length > 0) {
      leaks.forEach((file) => {
        failures.push(`Binary file detected in visual-assets: ${path.join(path.relative(root, dir), file)}`);
      });
      logStatus(false, `Binary assets present in ${path.relative(root, dir)}`);
    } else {
      logStatus(true, `${path.relative(root, dir) || 'visual-assets'} clear of generated binaries`);
    }
  }
}

async function validateGenerateAssets(failures) {
  const relPath = 'theme-builder/generate-assets.js';
  const absPath = path.join(root, relPath);
  if (!(await fileExists(relPath))) {
    failures.push('generate-assets.js missing under theme-builder');
    logStatus(false, 'generate-assets.js missing under theme-builder');
    return;
  }

  const content = await fs.readFile(absPath, 'utf8');
  if (isBinaryBuffer(Buffer.from(content))) {
    failures.push('generate-assets.js contains binary payloads');
    logStatus(false, 'generate-assets.js contains binary payloads');
  } else {
    logStatus(true, 'generate-assets.js is text-only');
  }

  if (!/mkdirSync\(|ensureStructure\(/.test(content)) {
    failures.push('generate-assets.js lacks folder creation logic');
    logStatus(false, 'generate-assets.js lacks folder creation logic');
  }

  if (!/process\.env\.CI|process\.env\.GITHUB_ACTIONS/.test(content)) {
    failures.push('generate-assets.js does not guard against CI execution');
    logStatus(false, 'generate-assets.js does not guard against CI execution');
  }

  if (/main\(\)|run\(\)/.test(content) && !/if\s*\(.*import\.meta\.main/.test(content)) {
    failures.push('generate-assets.js executes immediately on import');
    logStatus(false, 'generate-assets.js executes immediately on import');
  } else {
    logStatus(true, 'generate-assets.js can be imported safely');
  }
}

async function validateGitignore(failures) {
  const relPath = 'theme-builder/visual-assets/.gitignore';
  const absPath = path.join(root, relPath);
  if (!(await fileExists(relPath))) {
    failures.push('Missing visual-assets/.gitignore');
    logStatus(false, 'Missing visual-assets/.gitignore');
    return;
  }
  const content = (await fs.readFile(absPath, 'utf8')).trim();
  if (content === '*\n!.gitignore' || content === '*\n!.gitignore\n' || content === '*\n!.gitignore\r\n' || content === '*\n!.gitignore\r') {
    logStatus(true, '.gitignore is correct');
  } else if (content === '*\n!.gitignore'.trim()) {
    logStatus(true, '.gitignore is correct');
  } else {
    failures.push('Invalid .gitignore in visual-assets');
    logStatus(false, 'Invalid .gitignore in visual-assets');
  }
}

function basicQuery(html, selector) {
  if (selector.startsWith('#')) {
    const id = selector.slice(1);
    const regex = new RegExp(`id=["']${id}["']`, 'i');
    return regex.test(html);
  }
  if (selector.startsWith('.')) {
    const cls = selector.slice(1);
    const regex = new RegExp(`class=["'][^"']*${cls}[^"']*["']`, 'i');
    return regex.test(html);
  }
  const tagRegex = new RegExp(`<${selector}(\s|>)`, 'i');
  return tagRegex.test(html);
}

async function validateUIBootstrap(failures) {
  const indexPath = path.join(root, 'theme-builder', 'index.html');
  try {
    const html = await fs.readFile(indexPath, 'utf8');
    let domDocument = null;
    try {
      const jsdom = await import('jsdom');
      const { JSDOM } = jsdom;
      domDocument = new JSDOM(html).window.document;
    } catch {
      // Fallback lightweight parser when jsdom is unavailable
      domDocument = {
        querySelector: (sel) => (basicQuery(html, sel) ? {} : null),
        querySelectorAll: () => [],
      };
    }

    const selectors = [
      '#design-canvas',
      '.toolbelt',
      '.drawer',
      '.inspector',
      '.canvas-shell',
    ];

    selectors.forEach((selector) => {
      const found = domDocument.querySelector(selector);
      if (!found) {
        failures.push(`Missing UI element for selector: ${selector}`);
        logStatus(false, `Missing UI element for selector: ${selector}`);
      } else {
        logStatus(true, `UI element present: ${selector}`);
      }
    });

    const hasDataImages = /src=["']data:/i.test(html) || /url\(\s*['"]?data:/i.test(html);
    if (hasDataImages) {
      failures.push('Inline base64 images detected in index.html');
      logStatus(false, 'Inline base64 images detected in index.html');
    } else {
      logStatus(true, 'No inline base64 images found');
    }
  } catch (err) {
    failures.push(`Unable to read index.html: ${err.message}`);
    logStatus(false, `Unable to read index.html: ${err.message}`);
  }
}

function printSummary(failures) {
  console.log();
  console.log('---------------------------------------------');
  console.log('THEME BUILDER DIAGNOSTIC REPORT');
  console.log('---------------------------------------------');
  console.log();
  if (failures.length === 0) {
    console.log(`${colors.green}ALL SYSTEMS GO \ud83d\udd27\ud83e\uddf1\u2728${colors.reset}`);
  } else {
    failures.forEach((failure) => console.log(`${colors.red}\u2717 ${failure}${colors.reset}`));
  }
  console.log('---------------------------------------------');
}

async function main() {
  const failures = [];
  await validateDirectories(failures);
  await validateModules(failures);
  await validateThemeIntegrity(failures);
  await validateGenerateAssets(failures);
  await validateGitignore(failures);
  await validateUIBootstrap(failures);
  printSummary(failures);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(`${colors.red}Unexpected diagnostic error:${colors.reset} ${err.message}`);
  process.exitCode = 1;
});
