/**
 * Fisher-Price Theme Builder Asset Scanner
 *
 * This script scans construction-theme asset folders and CSS rules to build an
 * asset map and generate runtime-only visual previews. No binary assets are
 * committed; everything is produced when the script runs locally.
 *
 * Usage: node generate-assets.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import postcss from 'postcss';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to scan
const SOURCE_DIRS = [
  path.join(__dirname, 'assets', 'construction-theme'),
  path.join(__dirname, 'assets', 'constuction theme'),
];

// Output categories
const OUTPUT_ROOT = path.join(__dirname, 'visual-assets');
const OUTPUT_CATEGORIES = [
  'textures',
  'marks',
  'shapes',
  'borders',
  'patterns',
  'components',
  'colors',
  'glyphs',
];

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg']);
const CSS_EXTENSIONS = new Set(['.css']);

const assetMap = {
  version: 1,
  generatedAt: null,
  sources: [],
};

const stats = {
  scannedFiles: 0,
  images: 0,
  cssFiles: 0,
  cssRules: 0,
  glyphs: 0,
  warnings: 0,
};

function parseArgs(argv = process.argv.slice(2)) {
  return argv.reduce(
    (acc, entry) => {
      if (entry === '--rebuild') acc.rebuild = true;
      if (entry === '--only-css') acc.onlyCss = true;
      if (entry === '--only-images') acc.onlyImages = true;
      if (entry === '--no-previews') acc.noPreviews = true;
      return acc;
    },
    { rebuild: false, onlyCss: false, onlyImages: false, noPreviews: false },
  );
}

async function ensureOutputStructure() {
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  await Promise.all(
    OUTPUT_CATEGORIES.map((dir) => fs.mkdir(path.join(OUTPUT_ROOT, dir), { recursive: true })),
  );
  const gitignorePath = path.join(OUTPUT_ROOT, '.gitignore');
  const gitignoreContent = '*\n!.gitignore\n';
  await fs.writeFile(gitignorePath, gitignoreContent, 'utf8');
}

async function resetOutputRoot() {
  await fs.rm(OUTPUT_ROOT, { recursive: true, force: true });
  await ensureOutputStructure();
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else {
      yield fullPath;
    }
  }
}

const asRelative = (p) => path.relative(__dirname, p);

function inferCategory(filePath) {
  const name = filePath.toLowerCase();
  if (name.includes('glyph') || name.includes('sprite')) return 'glyphs';
  if (name.includes('border') || name.includes('outline')) return 'borders';
  if (name.includes('pattern') || name.includes('grid')) return 'patterns';
  if (name.includes('scribble') || name.includes('mark') || name.includes('fx')) return 'marks';
  if (name.includes('shape') || name.includes('blob')) return 'shapes';
  if (name.includes('color') || name.includes('palette') || name.includes('token')) return 'colors';
  if (name.includes('component') || name.includes('layout') || name.includes('spacing')) return 'components';
  return 'textures';
}

async function loadOptionalSharp() {
  try {
    const sharp = await import('sharp');
    return sharp.default || sharp;
  } catch (error) {
    console.warn('ℹ️  Optional dependency "sharp" not found. Image conversion will use placeholders.');
    return null;
  }
}

async function loadOptionalCanvas() {
  try {
    return await import('skia-canvas');
  } catch (error) {
    console.warn('ℹ️  Optional dependency "skia-canvas" not found. Canvas previews will be skipped.');
    return null;
  }
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

async function recordSpriteSheet(sharpInstance, baseName, category, entry, options) {
  const metadata = await sharpInstance.metadata();
  const cell = gcd(metadata.width || 0, metadata.height || 0) || 64;
  const cols = metadata.width ? Math.max(1, Math.floor((metadata.width || 0) / cell)) : 1;
  const rows = metadata.height ? Math.max(1, Math.floor((metadata.height || 0) / cell)) : 1;
  if (cols * rows <= 1) return false;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const glyphName = `${baseName}-r${row}-c${col}`;
      const extractOptions = { left: col * cell, top: row * cell, width: cell, height: cell };
      const target = path.join(OUTPUT_ROOT, 'glyphs', `${glyphName}.png`);
      if (!options.noPreviews) {
        await sharpInstance
          .extract(extractOptions)
          .png()
          .toFile(target)
          .catch(() => {});
        entry.outputs.push({ type: 'glyph', path: asRelative(target), cell, row, col });
      }
      stats.glyphs += 1;
    }
  }
  return true;
}

async function writeSvgPlaceholder(targetPath, label) {
  const safeLabel = (label || 'asset').replace(/</g, '&lt;');
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">\n  <rect width="320" height="320" fill="#f7f7f7" stroke="#999" stroke-width="4"/>\n  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#333" font-family="Arial, sans-serif" font-size="18">${safeLabel}</text>\n</svg>`;
  await fs.writeFile(targetPath, svgContent, 'utf8');
}

async function writePngPlaceholder(targetPath, label, canvasModule) {
  if (!canvasModule) return;
  const { Canvas } = canvasModule;
  const canvas = new Canvas(320, 320);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f0f4ff';
  ctx.fillRect(0, 0, 320, 320);
  ctx.strokeStyle = '#6c7fd1';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 304, 304);
  ctx.fillStyle = '#1e2a55';
  ctx.font = '600 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 160, 160, 280);
  const buffer = await canvas.toBuffer('png');
  await fs.writeFile(targetPath, buffer);
}

async function processImage(filePath, options, sharpModule, canvasModule) {
  const category = inferCategory(filePath);
  const baseName = path.basename(filePath, path.extname(filePath)).replace(/\s+/g, '-');
  const relPath = asRelative(filePath);
  const entry = { path: relPath, type: 'image', category, outputs: [], meta: {} };

  try {
    const sharpInstance = sharpModule ? sharpModule(filePath) : null;
    const metadata = sharpInstance ? await sharpInstance.metadata() : {};
    entry.meta = {
      format: metadata.format || path.extname(filePath).slice(1),
      width: metadata.width || null,
      height: metadata.height || null,
      hasAlpha: metadata.hasAlpha ?? null,
    };

    if (sharpInstance) {
      const spriteCaptured = baseName.includes('sprite') || baseName.includes('glyph');
      if (spriteCaptured) {
        const captured = await recordSpriteSheet(sharpInstance, baseName, category, entry, options);
        if (captured) {
          assetMap.sources.push(entry);
          stats.images += 1;
          return;
        }
      }
    }

    if (!options.onlyCss) {
      const targetDir = path.join(OUTPUT_ROOT, category);
      const pngTarget = path.join(targetDir, `${baseName}.png`);
      const svgTarget = path.join(targetDir, `${baseName}.svg`);

      if (sharpInstance) {
        await sharpInstance.png().toFile(pngTarget).catch(() => {});
        await sharpInstance.toFile(svgTarget).catch(() => {});
      } else {
        const placeholderLabel = `${category} ${baseName}`.slice(0, 40);
        await writePngPlaceholder(pngTarget, placeholderLabel, canvasModule).catch(() => {});
        await writeSvgPlaceholder(svgTarget, placeholderLabel).catch(() => {});
      }

      entry.outputs.push(
        { type: 'png', path: asRelative(pngTarget) },
        { type: 'svg', path: asRelative(svgTarget) },
      );
    }

    assetMap.sources.push(entry);
    stats.images += 1;
  } catch (error) {
    stats.warnings += 1;
    console.warn(`⚠️  Failed to process image ${relPath}:`, error.message);
  }
}

const COLOR_PROPERTIES = new Set([
  'color',
  'background',
  'background-color',
  'border-color',
  'outline-color',
  'fill',
  'stroke',
]);

const TYPOGRAPHY_PROPERTIES = new Set([
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
]);

const SPACING_PROPERTIES = new Set(['margin', 'padding', 'gap']);

function classifyCss(selector, decls) {
  const lower = selector.toLowerCase();
  const hasBorder = decls.some((d) => d.prop?.startsWith('border') || d.prop === 'outline');
  const hasBackground = decls.some((d) => d.prop?.startsWith('background'));
  const hasGradient = decls.some((d) => /gradient/iu.test(d.value || ''));
  const hasGrid = decls.some((d) => d.prop?.includes('grid') || /layout/iu.test(d.prop || ''));
  const hasSpacing = decls.some((d) => SPACING_PROPERTIES.has(d.prop || ''));
  const hasTypography = decls.some((d) => TYPOGRAPHY_PROPERTIES.has(d.prop || ''));
  const hasColorToken = decls.some((d) => COLOR_PROPERTIES.has(d.prop || '') || /(rgb|hsl|#)/iu.test(d.value || ''));
  const hasFx = lower.includes('fx') || decls.some((d) => /shadow/iu.test(d.prop || ''));

  if (lower.includes('::before') || lower.includes('::after')) return 'shapes';
  if (hasBorder) return 'borders';
  if (hasBackground || hasGradient) return 'patterns';
  if (hasFx) return 'marks';
  if (hasGrid || hasSpacing) return 'components';
  if (hasTypography) return 'components';
  if (hasColorToken || lower.includes('color')) return 'colors';
  return 'textures';
}

function extractBackgroundImages(decls) {
  const backgrounds = [];
  const urlPattern = /url\(([^)]+)\)/giu;
  for (const decl of decls) {
    if (!decl.value || !decl.prop?.startsWith('background')) continue;
    const matches = [...decl.value.matchAll(urlPattern)];
    for (const match of matches) {
      const raw = match[1].replace(/["']/g, '');
      backgrounds.push(raw);
    }
  }
  return backgrounds;
}

async function renderCssPreview(selector, category, decls, canvasModule) {
  if (!canvasModule) return null;
  const { Canvas } = canvasModule;
  const canvas = new Canvas(360, 360);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f9f9fb';
  ctx.fillRect(0, 0, 360, 360);

  const colorDecl = decls.find((d) => COLOR_PROPERTIES.has(d.prop || ''));
  const color = colorDecl?.value || '#f2c14f';
  const spacingDecl = decls.find((d) => SPACING_PROPERTIES.has(d.prop || ''));
  const spacing = spacingDecl ? Number.parseInt(spacingDecl.value, 10) || 16 : 16;
  const label = selector.replace(/\s+/g, ' ').trim().slice(0, 40);

  if (category === 'borders') {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, spacing / 4);
    ctx.strokeRect(30, 30, 300, 300);
  } else if (category === 'patterns') {
    const gradient = ctx.createLinearGradient(0, 0, 360, 360);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.fillRect(20, 20, 320, 320);
  } else if (category === 'colors') {
    ctx.fillStyle = color;
    ctx.fillRect(40, 40, 280, 280);
  } else if (category === 'components') {
    ctx.strokeStyle = '#3e63dd';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      ctx.strokeRect(40 + i * spacing, 60 + i * spacing, 240, 200);
    }
  } else if (category === 'shapes') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(180, 60);
    ctx.lineTo(260, 180);
    ctx.lineTo(180, 300);
    ctx.lineTo(100, 180);
    ctx.closePath();
    ctx.fill();
  } else if (category === 'marks') {
    let seed = Array.from(selector).reduce((acc, c) => acc + c.charCodeAt(0), 0) || 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i += 1) {
      ctx.beginPath();
      ctx.moveTo(40 + random() * 280, 40 + random() * 280);
      ctx.lineTo(40 + random() * 280, 40 + random() * 280);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#eaeaea';
    ctx.fillRect(30, 30, 300, 300);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.font = '600 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label || category, 180, 332);

  return canvas;
}

async function recordCssRule(rule, filePath, options, canvasModule) {
  const selectors = rule.selectors || [];
  const decls = rule.nodes?.filter((n) => n.type === 'decl') || [];
  const backgrounds = extractBackgroundImages(decls);
  const borders = decls.filter((d) => d.prop?.startsWith('border'));
  const colors = decls.filter((d) => COLOR_PROPERTIES.has(d.prop || ''));
  const typography = decls.filter((d) => TYPOGRAPHY_PROPERTIES.has(d.prop || ''));
  const spacing = decls.filter((d) => SPACING_PROPERTIES.has(d.prop || ''));

  for (const selector of selectors) {
    const category = classifyCss(selector, decls);
    const entry = {
      path: asRelative(filePath),
      selector,
      type: 'css-rule',
      category,
      outputs: [],
      meta: {
        backgrounds,
        borders: borders.map((b) => ({ property: b.prop, value: b.value })),
        colors: colors.map((c) => ({ property: c.prop, value: c.value })),
        typography: typography.map((t) => ({ property: t.prop, value: t.value })),
        spacing: spacing.map((s) => ({ property: s.prop, value: s.value })),
      },
    };

    if (!options.onlyImages && !options.noPreviews) {
      const canvas = await renderCssPreview(selector, category, decls, canvasModule);
      if (canvas) {
        const safeName = selector
          .replace(/[^a-z0-9_-]+/gi, '-')
          .replace(/-+/g, '-')
          .replace(/^[-]+|[-]+$/g, '');
        const name = safeName || Buffer.from(selector).toString('base64').replace(/=+$/u, '').slice(0, 12);
        const outputPath = path.join(OUTPUT_ROOT, category, `${name}-preview.png`);
        await fs.writeFile(outputPath, await canvas.toBuffer('png'));
        entry.outputs.push({ type: 'preview', path: asRelative(outputPath) });
      }
    }

    assetMap.sources.push(entry);
    stats.cssRules += 1;
  }
}

async function processCssFile(filePath, options, canvasModule) {
  const relPath = asRelative(filePath);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const root = postcss.parse(content, { from: filePath });

    const rules = [];
    root.walkRules((rule) => rules.push(rule));
    for (const rule of rules) {
      // eslint-disable-next-line no-await-in-loop
      await recordCssRule(rule, filePath, options, canvasModule);
    }

    stats.cssFiles += 1;
  } catch (error) {
    stats.warnings += 1;
    console.warn(`⚠️  Failed to parse CSS ${relPath}:`, error.message);
  }
}

async function processFile(filePath, options, sharpModule, canvasModule) {
  const ext = path.extname(filePath).toLowerCase();
  stats.scannedFiles += 1;

  if (IMAGE_EXTENSIONS.has(ext) && !options.onlyCss) {
    await processImage(filePath, options, sharpModule, canvasModule);
  } else if (CSS_EXTENSIONS.has(ext) && !options.onlyImages) {
    await processCssFile(filePath, options, canvasModule);
  }
}

async function writeAssetMap() {
  const payload = {
    ...assetMap,
    generatedAt: new Date().toISOString(),
    sources: [...assetMap.sources].sort((a, b) => {
      const first = `${a.category || ''}:${a.path || ''}`;
      const second = `${b.category || ''}:${b.path || ''}`;
      return first.localeCompare(second);
    }),
  };
  await fs.writeFile(path.join(OUTPUT_ROOT, 'asset-map.json'), JSON.stringify(payload, null, 2), 'utf8');
}

function summarize(durationMs) {
  console.log('--- Asset Scanner Summary ---');
  console.log(` Scanned files: ${stats.scannedFiles}`);
  console.log(` Images: ${stats.images}`);
  console.log(` CSS files: ${stats.cssFiles}`);
  console.log(` CSS rules indexed: ${stats.cssRules}`);
  console.log(` Glyphs sliced: ${stats.glyphs}`);
  console.log(` Warnings: ${stats.warnings}`);
  console.log(` Duration: ${durationMs.toFixed(2)}ms`);
}

export async function run(options = parseArgs()) {
  const start = performance.now();

  if (options.onlyCss && options.onlyImages) {
    console.warn('Conflicting options: --only-css and --only-images cannot be used together. Running full scan.');
    options.onlyCss = false;
    options.onlyImages = false;
  }

  if (options.rebuild) {
    await resetOutputRoot();
  } else {
    await ensureOutputStructure();
  }

  const sharpModule = await loadOptionalSharp();
  const canvasModule = await loadOptionalCanvas();

  for (const dir of SOURCE_DIRS) {
    console.log(`Scanning directory: ${dir}`);
    for await (const filePath of walk(dir)) {
      await processFile(filePath, options, sharpModule, canvasModule);
    }
  }

  await writeAssetMap();
  summarize(performance.now() - start);
}

if (import.meta.url === `file://${__filename}`) {
  run().catch((error) => {
    console.error('Asset scanner failed:', error);
    process.exitCode = 1;
  });
}
