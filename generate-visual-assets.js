import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse as parseCss } from 'css';
import { Canvas, Image } from 'skia-canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIRS = [
  path.join(__dirname, 'assets', 'construction-theme'),
  path.join(__dirname, 'assets', 'constuction-theme'),
];

const OUTPUT_ROOT = path.join(__dirname, 'visual-assets');
const OUTPUT_DIRS = [
  'borders',
  'boxes',
  'colors',
  'grids',
  'spacing',
  'marks',
  'textures',
  'shapes',
  'components',
  'glyphs',
];

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'];

const assetMap = {
  generatedAt: null,
  sourceRoots: SOURCE_DIRS,
  assets: [],
};

async function ensureOutputStructure() {
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  for (const dir of OUTPUT_DIRS) {
    await fs.mkdir(path.join(OUTPUT_ROOT, dir), { recursive: true });
  }
}

async function walkFiles(dir, predicate) {
  let results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(await walkFiles(fullPath, predicate));
    } else if (!predicate || predicate(fullPath, entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function loadImageFromFile(filePath) {
  return fs.readFile(filePath).then((data) => {
    const image = new Image();
    image.src = data;
    return image;
  });
}

function createCanvas(width = 400, height = 400) {
  return new Canvas(width, height);
}

async function saveCanvasVariants(canvas, baseName, category) {
  const pngPath = path.join(OUTPUT_ROOT, category, `${baseName}.png`);
  const svgPath = path.join(OUTPUT_ROOT, category, `${baseName}.svg`);
  await fs.writeFile(pngPath, await canvas.toBuffer('png'));
  await fs.writeFile(svgPath, await canvas.toBuffer('svg'));
  return { pngPath, svgPath };
}

function registerAsset({ name, category, source, outputs, meta }) {
  assetMap.assets.push({ name, category, source, outputs, meta });
}

function colorFromDeclarations(declarations) {
  const colorDecl = declarations.find((d) => ['color', 'background', 'background-color', 'border-color'].includes(d.property));
  return colorDecl ? colorDecl.value : '#f2c14f';
}

function borderWidthFromDeclarations(declarations) {
  const borderDecl = declarations.find((d) => d.property?.startsWith('border'));
  if (!borderDecl) return 4;
  const match = borderDecl.value.match(/(\d+)px/);
  return match ? Number(match[1]) : 4;
}

function spacingFromDeclarations(declarations) {
  const spacingDecl = declarations.find((d) => ['padding', 'margin', 'gap'].includes(d.property));
  if (!spacingDecl) return 16;
  const match = spacingDecl.value.match(/(\d+)px/);
  return match ? Number(match[1]) : 16;
}

function drawLabel(ctx, text) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.font = 'bold 18px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, ctx.canvas.width / 2, ctx.canvas.height - 20);
}

async function renderBorderExample(rule, declarations) {
  const canvas = createCanvas(400, 400);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f6f6f6';
  ctx.fillRect(0, 0, 400, 400);
  const color = colorFromDeclarations(declarations);
  const width = borderWidthFromDeclarations(declarations);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.strokeRect(width, width, 400 - width * 2, 400 - width * 2);
  drawLabel(ctx, rule);
  const outputs = await saveCanvasVariants(canvas, rule, 'borders');
  registerAsset({ name: rule, category: 'borders', source: 'css', outputs, meta: { color, width } });
}

async function renderBoxExample(rule, declarations) {
  const canvas = createCanvas(400, 400);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = declarations.find((d) => d.property === 'background-color')?.value || '#e0e0e0';
  ctx.fillRect(40, 40, 320, 320);
  ctx.strokeStyle = declarations.find((d) => d.property?.startsWith('border'))?.value?.split(' ').at(-1) || '#444';
  ctx.lineWidth = borderWidthFromDeclarations(declarations) || 2;
  ctx.strokeRect(40, 40, 320, 320);
  drawLabel(ctx, rule);
  const outputs = await saveCanvasVariants(canvas, rule, 'boxes');
  registerAsset({ name: rule, category: 'boxes', source: 'css', outputs, meta: { declarations } });
}

async function renderSpacingExample(rule, declarations) {
  const canvas = createCanvas(400, 400);
  const ctx = canvas.getContext('2d');
  const spacing = spacingFromDeclarations(declarations);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 400, 400);
  ctx.strokeStyle = '#ff7f11';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, 320, 320);
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(40 + spacing, 40 + spacing, 320 - spacing * 2, 320 - spacing * 2);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,127,17,0.12)';
  ctx.fillRect(40, 40, spacing, 320);
  ctx.fillRect(360 - spacing, 40, spacing, 320);
  ctx.fillRect(40, 40, 320, spacing);
  ctx.fillRect(40, 360 - spacing, 320, spacing);
  drawLabel(ctx, `${rule} (${spacing}px)`);
  const outputs = await saveCanvasVariants(canvas, rule, 'spacing');
  registerAsset({ name: rule, category: 'spacing', source: 'css', outputs, meta: { spacing } });
}

async function renderColorExample(rule, declarations) {
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');
  const swatch = colorFromDeclarations(declarations);
  ctx.fillStyle = swatch;
  ctx.fillRect(0, 0, 200, 200);
  drawLabel(ctx, rule);
  const outputs = await saveCanvasVariants(canvas, rule, 'colors');
  registerAsset({ name: rule, category: 'colors', source: 'css', outputs, meta: { swatch } });
}

async function renderGridExample(rule, declarations) {
  const canvas = createCanvas(400, 400);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, 400, 400);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  const gap = spacingFromDeclarations(declarations) || 40;
  for (let x = 0; x <= 400; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 400);
    ctx.stroke();
  }
  for (let y = 0; y <= 400; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(400, y);
    ctx.stroke();
  }
  drawLabel(ctx, `${rule} grid`);
  const outputs = await saveCanvasVariants(canvas, rule, 'grids');
  registerAsset({ name: rule, category: 'grids', source: 'css', outputs, meta: { gap } });
}

async function renderShapeExample(rule, declarations) {
  const canvas = createCanvas(400, 400);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = declarations.find((d) => d.property === 'background')?.value || '#d9534f';
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(200, 60);
  ctx.lineTo(340, 200);
  ctx.lineTo(200, 340);
  ctx.lineTo(60, 200);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawLabel(ctx, rule);
  const outputs = await saveCanvasVariants(canvas, rule, 'shapes');
  registerAsset({ name: rule, category: 'shapes', source: 'css', outputs, meta: { declarations } });
}

async function renderComponentExample(rule, declarations) {
  const canvas = createCanvas(400, 400);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e8f1fb';
  ctx.fillRect(30, 30, 340, 340);
  ctx.fillStyle = '#2c5282';
  ctx.fillRect(50, 100, 300, 200);
  ctx.fillStyle = '#fff';
  ctx.fillRect(70, 120, 260, 80);
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(70, 210, 180, 70);
  drawLabel(ctx, rule);
  const outputs = await saveCanvasVariants(canvas, rule, 'components');
  registerAsset({ name: rule, category: 'components', source: 'css', outputs, meta: { declarations } });
}

function categorizeRule(rule, declarations) {
  const props = declarations.map((d) => d.property);
  if (props.some((p) => p?.startsWith('border'))) return 'border';
  if (props.includes('display') && declarations.find((d) => d.value.includes('grid'))) return 'grid';
  if (props.includes('gap') || props.includes('padding') || props.includes('margin')) return 'spacing';
  if (props.includes('background-color') || props.includes('color')) return 'color';
  if (props.includes('clip-path') || props.includes('border-radius')) return 'shape';
  if (rule.includes('component') || rule.includes('fx')) return 'component';
  return 'box';
}

async function processCssRule(selector, declarations, sourceFile) {
  const classes = selector
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.startsWith('.'))
    .map((part) => part.replace(/^[.]/, ''));

  for (const cls of classes) {
    const category = categorizeRule(cls, declarations);
    if (category === 'border') {
      await renderBorderExample(cls, declarations);
    } else if (category === 'grid') {
      await renderGridExample(cls, declarations);
    } else if (category === 'spacing') {
      await renderSpacingExample(cls, declarations);
    } else if (category === 'color') {
      await renderColorExample(cls, declarations);
    } else if (category === 'shape') {
      await renderShapeExample(cls, declarations);
    } else if (category === 'component') {
      await renderComponentExample(cls, declarations);
    } else {
      await renderBoxExample(cls, declarations);
    }
  }
}

async function parseCssFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const tree = parseCss(content);
  for (const rule of tree.stylesheet.rules) {
    if (rule.type !== 'rule') continue;
    for (const selector of rule.selectors || []) {
      await processCssRule(selector, rule.declarations.filter(Boolean), filePath);
    }
  }
}

function detectCategoryFromPath(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.includes('mark')) return 'marks';
  if (lower.includes('texture')) return 'textures';
  if (lower.includes('shape')) return 'shapes';
  if (lower.includes('border')) return 'borders';
  if (lower.includes('pattern')) return 'textures';
  if (lower.includes('glyph')) return 'glyphs';
  return 'components';
}

function getBoundingBoxes(imageData, width, height) {
  const visited = new Uint8Array(width * height);
  const boxes = [];
  const index = (x, y) => y * width + x;

  const inBounds = (x, y) => x >= 0 && y >= 0 && x < width && y < height;
  const isInk = (x, y) => {
    const i = index(x, y) * 4;
    const alpha = imageData.data[i + 3];
    return alpha > 10;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = index(x, y);
      if (visited[idx] || !isInk(x, y)) continue;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      const queue = [[x, y]];
      visited[idx] = 1;
      while (queue.length) {
        const [cx, cy] = queue.pop();
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (!inBounds(nx, ny)) continue;
          const nIdx = index(nx, ny);
          if (visited[nIdx] || !isInk(nx, ny)) continue;
          visited[nIdx] = 1;
          queue.push([nx, ny]);
        }
      }
      boxes.push({ minX, minY, maxX, maxY });
    }
  }
  return boxes;
}

async function splitGlyphSheet(filePath) {
  const image = await loadImageFromFile(filePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const boxes = getBoundingBoxes(imageData, image.width, image.height);
  const glyphOutputs = [];
  let counter = 0;
  for (const box of boxes) {
    const glyphCanvas = createCanvas(box.maxX - box.minX + 1, box.maxY - box.minY + 1);
    const glyphCtx = glyphCanvas.getContext('2d');
    glyphCtx.putImageData(
      ctx.getImageData(box.minX, box.minY, box.maxX - box.minX + 1, box.maxY - box.minY + 1),
      0,
      0,
    );
    const name = `${path.parse(filePath).name}-glyph-${String(counter).padStart(3, '0')}`;
    const outputs = await saveCanvasVariants(glyphCanvas, name, 'glyphs');
    glyphOutputs.push({ name, outputs });
    counter += 1;
  }
  registerAsset({
    name: path.parse(filePath).name,
    category: 'glyphs',
    source: filePath,
    outputs: glyphOutputs.map((g) => g.outputs),
    meta: { glyphCount: glyphOutputs.length },
  });
}

async function processImage(filePath) {
  const category = detectCategoryFromPath(filePath);
  const baseName = path.parse(filePath).name;
  if (category === 'glyphs') {
    await splitGlyphSheet(filePath);
    return;
  }

  if (path.extname(filePath).toLowerCase() === '.svg') {
    const targetPath = path.join(OUTPUT_ROOT, category, `${baseName}.svg`);
    await fs.copyFile(filePath, targetPath);
    registerAsset({ name: baseName, category, source: filePath, outputs: { svgPath: targetPath }, meta: { copied: true } });
    return;
  }

  const image = await loadImageFromFile(filePath);
  const canvas = createCanvas(Math.max(200, image.width), Math.max(200, image.height));
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const offsetX = (canvas.width - image.width) / 2;
  const offsetY = (canvas.height - image.height) / 2;
  ctx.drawImage(image, offsetX, offsetY, image.width, image.height);
  drawLabel(ctx, baseName);
  const outputs = await saveCanvasVariants(canvas, baseName, category);
  registerAsset({ name: baseName, category, source: filePath, outputs, meta: { centered: true } });
}

async function parseCssTrees() {
  for (const dir of SOURCE_DIRS) {
    const cssFiles = await walkFiles(dir, (fullPath) => fullPath.endsWith('.css'));
    for (const file of cssFiles) {
      await parseCssFile(file);
    }
  }
}

async function processImages() {
  for (const dir of SOURCE_DIRS) {
    const images = await walkFiles(dir, (fullPath) => IMAGE_EXTENSIONS.includes(path.extname(fullPath).toLowerCase()));
    for (const imagePath of images) {
      await processImage(imagePath);
    }
  }
}

async function writeAssetMap() {
  assetMap.generatedAt = new Date().toISOString();
  await fs.writeFile(path.join(OUTPUT_ROOT, 'asset-map.json'), JSON.stringify(assetMap, null, 2));
}

async function main() {
  await ensureOutputStructure();
  await parseCssTrees();
  await processImages();
  await writeAssetMap();
  console.log(`Generated ${assetMap.assets.length} assets into ${OUTPUT_ROOT}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Failed to generate visual assets:', err);
    process.exit(1);
  });
}
