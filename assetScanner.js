/**
 * Fisher-Price Theme Builder Asset Scanner
 *
 * Scans theme assets and CSS to generate runtime-only visual artifacts inside
 * `visual-assets/`. All generated outputs are git-ignored; only this script and
 * the directory-level .gitignore are committed.
 *
 * Usage examples:
 *   node assetScanner.js
 *   node assetScanner.js --only-css
 *   node assetScanner.js --only-images --no-thumbnails
 *   node assetScanner.js --rebuild
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import { parse as parseCss } from 'css';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIRS = [
  path.join(__dirname, 'assets', 'construction-theme'),
  path.join(__dirname, 'assets', 'constuction-theme'),
  path.join(__dirname, 'assets', 'construction theme'),
];

const OUTPUT_ROOT = path.join(__dirname, 'visual-assets');
const OUTPUT_CATEGORIES = ['textures', 'marks', 'shapes', 'borders', 'patterns', 'components', 'colors', 'glyphs'];
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.avif']);
const CSS_EXTENSIONS = new Set(['.css']);

const assetMap = {
  sources: [],
  generatedAt: null,
  version: 1,
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
      if (entry === '--no-thumbnails') acc.noThumbnails = true;
      else if (entry === '--only-css') acc.onlyCss = true;
      else if (entry === '--only-images') acc.onlyImages = true;
      else if (entry === '--rebuild') acc.rebuild = true;
      return acc;
    },
    { noThumbnails: false, onlyCss: false, onlyImages: false, rebuild: false },
  );
}

async function ensureOutputStructure() {
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  for (const dir of OUTPUT_CATEGORIES) {
    await fs.mkdir(path.join(OUTPUT_ROOT, dir), { recursive: true });
  }
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

async function loadOptionalSharp() {
  try {
    return await import('sharp');
  } catch (error) {
    return null;
  }
}

async function loadOptionalCanvas() {
  try {
    return await import('skia-canvas');
  } catch (error) {
    return null;
  }
}

function asRelative(filePath) {
  return path.relative(__dirname, filePath);
}

function inferCategory(filePath) {
  const name = filePath.toLowerCase();
  if (name.includes('glyph') || name.includes('sprite')) return 'glyphs';
  if (name.includes('border') || name.includes('outline')) return 'borders';
  if (name.includes('pattern') || name.includes('grid')) return 'patterns';
  if (name.includes('mark') || name.includes('scribble') || name.includes('fx')) return 'marks';
  if (name.includes('shape')) return 'shapes';
  if (name.includes('color')) return 'colors';
  if (name.includes('component') || name.includes('layout')) return 'components';
  return 'textures';
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

async function recordSpriteSheet(sharpInstance, baseName, category, outputMeta, options) {
  const metadata = await sharpInstance.metadata();
  const cell = gcd(metadata.width || 0, metadata.height || 0) || 64;
  const cols = metadata.width ? Math.max(1, Math.floor(metadata.width / cell)) : 1;
  const rows = metadata.height ? Math.max(1, Math.floor(metadata.height / cell)) : 1;
  if (cols * rows <= 1) return false;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const glyphName = `${baseName}-r${row}-c${col}`;
      const extractOptions = { left: col * cell, top: row * cell, width: cell, height: cell };
      if (!options.onlyCss && !options.noThumbnails) {
        const pngPath = path.join(OUTPUT_ROOT, 'glyphs', `${glyphName}.png`);
        await sharpInstance.extract(extractOptions).png().toFile(pngPath).catch(() => {});
      }
      outputMeta.outputs.push({ type: 'glyph', name: glyphName, cell, row, col });
      stats.glyphs += 1;
    }
  }
  return true;
}

async function processImage(filePath, options, sharpModule) {
  const category = inferCategory(filePath);
  const baseName = path.basename(filePath, path.extname(filePath)).replace(/\s+/g, '-');
  const relPath = asRelative(filePath);
  const entry = { path: relPath, type: 'image', category, meta: {}, outputs: [] };

  try {
    const sharpInstance = sharpModule ? sharpModule.default(filePath) : null;
    const metadata = sharpInstance ? await sharpInstance.metadata() : {};
    entry.meta = {
      format: metadata.format || path.extname(filePath).slice(1),
      width: metadata.width || null,
      height: metadata.height || null,
      hasAlpha: metadata.hasAlpha ?? null,
    };

    const isSprite = baseName.includes('sprite') || baseName.includes('glyph');
    if (isSprite && sharpInstance) {
      const captured = await recordSpriteSheet(sharpInstance, baseName, category, entry, options);
      if (captured) {
        assetMap.sources.push(entry);
        stats.images += 1;
        return;
      }
    }

    if (!options.onlyCss) {
      const targetDir = path.join(OUTPUT_ROOT, category);
      const pngPath = path.join(targetDir, `${baseName}.png`);
      const svgPath = path.join(targetDir, `${baseName}.svg`);

      if (sharpInstance) {
        await sharpInstance.png().toFile(pngPath).catch(() => {});
        await sharpInstance.toFile(svgPath).catch(() => {});
        if (!options.noThumbnails) {
          const thumbPath = path.join(targetDir, `${baseName}-thumb.png`);
          await sharpInstance.resize(200, 200, { fit: 'inside' }).png().toFile(thumbPath).catch(() => {});
          entry.outputs.push({ type: 'thumbnail', path: asRelative(thumbPath) });
        }
      }
      entry.outputs.push({ type: 'png', path: asRelative(pngPath) }, { type: 'svg', path: asRelative(svgPath) });
    }
    assetMap.sources.push(entry);
    stats.images += 1;
  } catch (error) {
    stats.warnings += 1;
    console.warn(`⚠️  Failed to process image ${relPath}:`, error.message);
  }
}

function pickColor(declarations) {
  const colorDecl = declarations.find((d) =>
    ['color', 'background', 'background-color', 'border-color', 'outline-color'].includes(d.property),
  );
  if (colorDecl?.value) return colorDecl.value;
  const variableDecl = declarations.find((d) => d.property?.startsWith('--'));
  return variableDecl?.value || '#f2c14f';
}

function classifyCssRule(selector, declarations) {
  const lowerSelector = selector.toLowerCase();
  const hasBackground = declarations.some((d) => d.property?.startsWith('background'));
  const hasGradient = declarations.some((d) => /gradient/iu.test(d.value || ''));
  const hasBorder = declarations.some((d) => d.property?.startsWith('border'));
  const hasOutline = declarations.some((d) => d.property === 'outline' || d.property === 'outline-color');
  const hasGrid = declarations.some((d) => d.property?.startsWith('grid'));
  const hasSpacing = declarations.some((d) => ['margin', 'padding', 'gap'].includes(d.property));
  const hasTypography = declarations.some((d) => ['font-family', 'font-size', 'font-weight', 'line-height'].includes(d.property));
  const hasColorVar = declarations.some((d) => d.property?.startsWith('--') || /(rgb|hsl|#)/iu.test(d.value || ''));

  if (lowerSelector.includes('::before') || lowerSelector.includes('::after')) return 'shapes';
  if (hasBorder || hasOutline) return 'borders';
  if (hasBackground || hasGradient) return 'patterns';
  if (hasGrid || lowerSelector.includes('grid')) return 'components';
  if (hasSpacing || lowerSelector.includes('space')) return 'components';
  if (hasTypography) return 'components';
  if (hasColorVar || lowerSelector.includes('color')) return 'colors';
  if (lowerSelector.includes('fx')) return 'marks';
  return 'textures';
}

async function renderCssPreview(selector, category, declarations, canvasModule) {
  if (!canvasModule) return null;
  const { Canvas } = canvasModule;
  const canvas = new Canvas(360, 360);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f9f9f9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const color = pickColor(declarations);
  const spacingDecl = declarations.find((d) => ['margin', 'padding', 'gap'].includes(d.property));
  const spacing = spacingDecl?.value ? Number.parseInt(spacingDecl.value, 10) || 16 : 16;
  const label = selector.replace(/\s+/g, ' ').trim().slice(0, 40);

  if (category === 'borders') {
    ctx.strokeStyle = color;
    ctx.lineWidth = spacing / 4;
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
    ctx.strokeStyle = '#4d6fff';
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
    let seed = Array.from(selector).reduce((acc, char) => acc + char.charCodeAt(0), 0) || 1;
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

  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.font = '600 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label || category, canvas.width / 2, canvas.height - 20);

  return canvas;
}

async function recordCssDeclarations(selectors, declarations, filePath, options, canvasModule) {
  for (const selector of selectors) {
    const category = classifyCssRule(selector, declarations);
    const entry = {
      path: asRelative(filePath),
      selector,
      type: 'css-class',
      category,
      outputs: [],
      meta: {
        properties: declarations
          .filter((d) => d.type === 'declaration')
          .map((d) => ({ property: d.property, value: d.value })),
      },
    };
    if (!options.onlyImages) {
      const canvas = await renderCssPreview(selector, category, declarations, canvasModule);
      if (canvas) {
        const safeName = selector.replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').replace(/^[-]+|[-]+$/g, '');
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
    const cssContent = await fs.readFile(filePath, 'utf8');
    const parsed = parseCss(cssContent, { silent: true });
    const rules = parsed.stylesheet?.rules || [];
    for (const rule of rules) {
      if (rule.type === 'rule' && rule.selectors) {
        const declarations = rule.declarations || [];
        await recordCssDeclarations(rule.selectors, declarations, filePath, options, canvasModule);
      }
      if (rule.type === 'media' && rule.rules) {
        for (const innerRule of rule.rules) {
          if (innerRule.type === 'rule' && innerRule.selectors) {
            await recordCssDeclarations(innerRule.selectors, innerRule.declarations || [], filePath, options, canvasModule);
          }
        }
      }
    }
    stats.cssFiles += 1;
  } catch (error) {
    stats.warnings += 1;
    console.warn(`⚠️  Failed to parse CSS ${relPath}:`, error.message);
  }
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

async function writeAssetMap() {
  const sortedSources = [...assetMap.sources].sort((a, b) => {
    const first = `${a.category || ''}:${a.path || ''}`;
    const second = `${b.category || ''}:${b.path || ''}`;
    return first.localeCompare(second);
  });
  const payload = {
    ...assetMap,
    sources: sortedSources,
    generatedAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(OUTPUT_ROOT, 'asset-map.json'), JSON.stringify(payload, null, 2), 'utf8');
}

async function processFile(filePath, options, sharpModule, canvasModule) {
  const ext = path.extname(filePath).toLowerCase();
  stats.scannedFiles += 1;
  if (IMAGE_EXTENSIONS.has(ext) && !options.onlyCss) {
    await processImage(filePath, options, sharpModule);
  } else if (CSS_EXTENSIONS.has(ext) && !options.onlyImages) {
    await processCssFile(filePath, options, canvasModule);
  } else {
    console.warn(`Skipping unsupported file: ${asRelative(filePath)}`);
  }
}

async function run() {
  const options = parseArgs();
  const start = performance.now();

  if (options.onlyCss && options.onlyImages) {
    console.warn('Conflicting options: --only-css and --only-images cannot be used together. Defaulting to full scan.');
    options.onlyCss = false;
    options.onlyImages = false;
  }

  if (options.rebuild) {
    await resetOutputRoot();
  } else {
    await ensureOutputStructure();
  }

  const sharpModule = await loadOptionalSharp();
  if (!sharpModule) {
    console.warn('ℹ️  Optional dependency "sharp" not found. Image processing will be limited to metadata.');
  }

  const canvasModule = await loadOptionalCanvas();
  if (!canvasModule) {
    console.warn('ℹ️  Optional dependency "skia-canvas" not found. CSS previews will be metadata-only.');
  }

  for (const dir of SOURCE_DIRS) {
    console.log(`Scanning directory: ${dir}`);
    for await (const filePath of walk(dir)) {
      await processFile(filePath, options, sharpModule, canvasModule);
    }
  }

  await writeAssetMap();
  const duration = performance.now() - start;
  summarize(duration);
}

if (import.meta.url === `file://${__filename}`) {
  run().catch((error) => {
    console.error('Asset scanner failed:', error);
    process.exitCode = 1;
  });
}
