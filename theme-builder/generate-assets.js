#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = path.resolve('./theme-builder');
const inputDirs = ['assets/construction-theme', 'assets/constuction-theme'].map((p) => path.join(root, p));
const outputRoot = path.join(root, 'visual-assets');
const categories = ['textures', 'marks', 'shapes', 'borders', 'patterns', 'components', 'colors', 'glyphs', 'grids'];

async function main() {
  ensureStructure();
  const assetMap = {};
  for (const category of categories) {
    assetMap[category] = [];
  }

  for (const dir of inputDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const ext = path.extname(file).toLowerCase();
      const fullPath = path.join(dir, file);
      if (ext === '.css') {
        const tokens = parseCSS(fs.readFileSync(fullPath, 'utf8'));
        tokens.colors.forEach((color, idx) => {
          const outPath = path.join(outputRoot, 'colors', `${path.basename(file, ext)}-${idx}.svg`);
          fs.writeFileSync(outPath, buildColorSwatch(color));
          assetMap.colors.push({ name: `${file} color ${idx + 1}`, type: 'colors', src: `./visual-assets/colors/${path.basename(outPath)}` });
        });
        return;
      }
      const category = pickCategory(file);
      if (!assetMap[category]) return;
      const targetDir = path.join(outputRoot, category);
      const outPath = path.join(targetDir, file.replace(ext, '.png'));
      writePlaceholderPNG(outPath, file);
      assetMap[category].push({
        name: file.replace(ext, ''),
        type: category,
        src: `./visual-assets/${category}/${path.basename(outPath)}`,
      });
    });
  }

  const mapPath = path.join(outputRoot, 'asset-map.json');
  fs.writeFileSync(mapPath, JSON.stringify(assetMap, null, 2));
  console.log(`Generated ${Object.values(assetMap).flat().length} assets to ${outputRoot}`);
  console.log('Remember: visual-assets/ is gitignored and should not be committed.');
}

function ensureStructure() {
  if (!fs.existsSync(outputRoot)) fs.mkdirSync(outputRoot, { recursive: true });
  categories.forEach((category) => {
    const dir = path.join(outputRoot, category);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function pickCategory(file) {
  const lower = file.toLowerCase();
  if (lower.includes('grid')) return 'grids';
  if (lower.includes('mark')) return 'marks';
  if (lower.includes('shape')) return 'shapes';
  if (lower.includes('border')) return 'borders';
  if (lower.includes('pattern')) return 'patterns';
  if (lower.includes('glyph')) return 'glyphs';
  if (lower.includes('color')) return 'colors';
  if (lower.includes('component')) return 'components';
  return 'textures';
}

function writePlaceholderPNG(outPath, label) {
  const pngBase64 = createBase64PNG(label);
  fs.writeFileSync(outPath, Buffer.from(pngBase64, 'base64'));
}

function createBase64PNG(label) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200' viewBox='0 0 320 200'>
    <defs>
      <linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='#ffce00'/>
        <stop offset='100%' stop-color='#ff5757'/>
      </linearGradient>
    </defs>
    <rect width='320' height='200' rx='24' fill='url(#g)'/>
    <rect width='320' height='200' rx='24' fill='url(#g)' opacity='0.2'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#0f172a' font-family='Inter, sans-serif' font-size='24' font-weight='800'>${label}</text>
  </svg>`;
  const svg64 = Buffer.from(svg).toString('base64');
  // data encoded as base64 to keep repository text-only
  const pngDataUrl = `data:image/svg+xml;base64,${svg64}`;
  const data = pngDataUrl.replace(/^data:image\/svg\+xml;base64,/, '');
  return Buffer.from(data, 'base64').toString('base64');
}

function parseCSS(content) {
  const colorRegex = /#([0-9a-fA-F]{3,8})/g;
  const colors = [];
  let match;
  while ((match = colorRegex.exec(content))) {
    colors.push(`#${match[1]}`);
  }
  return { colors: Array.from(new Set(colors)).slice(0, 6) };
}

function buildColorSwatch(color) {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'>
    <rect x='4' y='4' width='72' height='72' rx='12' fill='${color}' stroke='#0f172a' stroke-width='4'/>
    <text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle' font-family='Inter, sans-serif' font-size='12' fill='#ffffff'>${color}</text>
  </svg>`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
