const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const sizeOf = require('image-size');
const ColorThief = require('color-thief-node');
const potrace = require('potrace');
const seedrandom = require('seedrandom');
const { createCanvas, loadImage, ImageData } = require('canvas');
const pixelmatch = require('pixelmatch');

const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg'];
const SEARCH_ROOTS = ['assets', 'assets/construction-theme', 'assets/constuction theme'];
const OUTPUT_ROOT = path.join(process.cwd(), 'creative-material');

async function main() {
  try {
    const force = process.argv.includes('--force');
    await prepareOutput(force);
    const rng = seedrandom('creative-material');
    const imageFiles = await findImages();
    if (!imageFiles.length) {
      console.warn('No images found in configured search paths.');
      return;
    }
    const catalog = [];
    const paletteCache = new Map();
    for (const file of imageFiles) {
      try {
        console.log(`Processing: ${file}`);
        const info = await collectMetadata(file);
        const classification = classifyAsset(info);
        const palette = await extractPalette(file, paletteCache);
        const relative = path.relative(process.cwd(), file);
        const baseName = slugify(path.parse(relative).name);
        const originalDest = path.join(OUTPUT_ROOT, 'originals', `${baseName}${path.extname(file)}`);
        await fs.ensureDir(path.dirname(originalDest));
        await fs.copy(file, originalDest);

        const variationPaths = {
          procedural: [],
          styles: [],
          warped: [],
          collage: [],
          patterns: []
        };
        const svgPaths = { edge: null, silhouette: null };

        variationPaths.procedural.push(...await generateProceduralVariations(file, baseName, rng));
        variationPaths.styles.push(...await generateStyleVariations(file, baseName));
        variationPaths.warped.push(...await generateWarpedVariations(file, baseName, rng));
        variationPaths.collage.push(...await generateCollageVariations(file, baseName, imageFiles, rng));
        variationPaths.patterns.push(...await generatePatternVariations(file, baseName, rng));
        svgPaths.edge = await vectorizeEdge(file, baseName);
        svgPaths.silhouette = await vectorizeSilhouette(file, baseName, info.hasAlpha);

        catalog.push({
          original: originalDest,
          classification,
          palette,
          stats: {
            entropy: info.entropy,
            transparent: info.hasAlpha,
            size: info.size,
            width: info.width,
            height: info.height
          },
          variations: variationPaths,
          svg: svgPaths
        });
      } catch (err) {
        console.error(`Error processing ${file}:`, err.message);
      }
    }
    await writeManifest(catalog);
    console.log('Creative material generation complete.');
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exitCode = 1;
  }
}

async function prepareOutput(force) {
  const exists = await fs.pathExists(OUTPUT_ROOT);
  if (exists && !force) {
    console.error('Output directory already exists. Run with --force to regenerate.');
    process.exit(1);
  }
  if (exists && force) {
    await fs.remove(OUTPUT_ROOT);
  }
  await fs.ensureDir(path.join(OUTPUT_ROOT, 'originals'));
  await fs.ensureDir(path.join(OUTPUT_ROOT, 'variations', 'procedural'));
  await fs.ensureDir(path.join(OUTPUT_ROOT, 'variations', 'styles'));
  await fs.ensureDir(path.join(OUTPUT_ROOT, 'variations', 'warped'));
  await fs.ensureDir(path.join(OUTPUT_ROOT, 'variations', 'collage'));
  await fs.ensureDir(path.join(OUTPUT_ROOT, 'variations', 'patterns'));
  await fs.ensureDir(path.join(OUTPUT_ROOT, 'swatches'));
  await fs.ensureDir(path.join(OUTPUT_ROOT, 'manifests'));
}

async function findImages() {
  const found = [];
  for (const root of SEARCH_ROOTS) {
    const full = path.join(process.cwd(), root);
    if (!await fs.pathExists(full)) continue;
    await walkDir(full, file => {
      if (!fs.lstatSync(file).isFile()) return;
      const ext = path.extname(file).toLowerCase();
      if (ALLOWED_EXT.includes(ext)) {
        found.push(file);
      }
    });
  }
  return found;
}

async function walkDir(dir, cb) {
  const entries = await fs.readdir(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stats = await fs.lstat(full);
    if (stats.isDirectory()) {
      await walkDir(full, cb);
    } else {
      cb(full);
    }
  }
}

async function collectMetadata(file) {
  const buffer = await fs.readFile(file);
  const dimensions = sizeOf(buffer);
  const stat = await fs.stat(file);
  const metadata = await sharp(buffer).metadata();
  const hasAlpha = Boolean(metadata.hasAlpha);
  const stats = await sharp(buffer).stats();
  const entropy = stats.entropy || 0;
  return {
    width: dimensions.width,
    height: dimensions.height,
    hasAlpha,
    size: stat.size,
    entropy
  };
}

function classifyAsset(meta) {
  const { width, height, hasAlpha, entropy } = meta;
  const ratio = width / height;
  if (entropy < 1.5 && ratio > 0.9 && ratio < 1.1) return 'patterns';
  if (hasAlpha && entropy < 3) return 'marks';
  if (hasAlpha && ratio > 2) return 'borders';
  if (!hasAlpha && entropy > 5) return 'textures';
  if (ratio < 0.4 || ratio > 2.5) return 'components';
  return 'shapes';
}

async function extractPalette(file, cache) {
  if (cache.has(file)) return cache.get(file);
  try {
    const palette = await ColorThief.getPalette(file, 6);
    const swatchPath = path.join(OUTPUT_ROOT, 'swatches', `${slugify(path.parse(file).name)}-swatch.json`);
    await fs.writeJson(swatchPath, palette, { spaces: 2 });
    cache.set(file, palette);
    return palette;
  } catch (err) {
    console.warn('Palette extraction failed for', file, err.message);
    cache.set(file, []);
    return [];
  }
}

function slugify(name) {
  return name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

async function generateProceduralVariations(file, baseName, rng) {
  const destDir = path.join(OUTPUT_ROOT, 'variations', 'procedural');
  const output = [];
  const ext = path.extname(file);
  const baseOutput = (label) => path.join(destDir, `${baseName}-${label}${ext}`);
  const sharpImg = sharp(file);

  const rotations = [0, 90, 180, 270];
  for (const angle of rotations) {
    const dest = baseOutput(`rot${angle}`);
    await sharpImg.rotate(angle).toFile(dest);
    output.push(dest);
  }

  const flipH = baseOutput('flipH');
  const flipV = baseOutput('flipV');
  await sharpImg.flip().toFile(flipV);
  output.push(flipV);
  await sharpImg.flop().toFile(flipH);
  output.push(flipH);

  const overlayPalette = await overlayColors(file, baseOutput('palette'));
  if (overlayPalette) output.push(overlayPalette);

  const patchwork = await createPatchwork(file, baseOutput('patchwork'));
  if (patchwork) output.push(patchwork);

  const multiCropPaths = await multiCrop(file, baseName, destDir, rng, ext);
  output.push(...multiCropPaths);

  const scribbleMaskPath = await applyScribbleMask(file, baseOutput('scribble'));
  if (scribbleMaskPath) output.push(scribbleMaskPath);

  const blended = await blendWithRandomTexture(file, baseOutput('blend'), rng);
  if (blended) output.push(blended);

  return output;
}

async function overlayColors(file, dest) {
  try {
    const img = sharp(file);
    const { width, height } = await img.metadata();
    const palette = [
      [255, 87, 34],
      [33, 150, 243],
      [156, 39, 176],
      [0, 188, 212],
      [255, 235, 59]
    ];
    const overlay = Buffer.from(new Array(width * height * 3).fill(0));
    for (let i = 0; i < width * height; i++) {
      const color = palette[i % palette.length];
      overlay[i * 3] = color[0];
      overlay[i * 3 + 1] = color[1];
      overlay[i * 3 + 2] = color[2];
    }
    await img
      .composite([{ input: overlay, raw: { width, height, channels: 3 }, blend: 'overlay' }])
      .toFile(dest);
    return dest;
  } catch (err) {
    console.warn('overlayColors failed', err.message);
    return null;
  }
}

async function createPatchwork(file, dest) {
  try {
    const img = sharp(file);
    const { width, height } = await img.metadata();
    const tile = await img.resize(Math.round(width / 2), Math.round(height / 2)).toBuffer();
    await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([
        { input: tile, top: 0, left: 0 },
        { input: tile, top: 0, left: Math.round(width / 2) },
        { input: tile, top: Math.round(height / 2), left: 0 },
        { input: tile, top: Math.round(height / 2), left: Math.round(width / 2) }
      ])
      .toFile(dest);
    return dest;
  } catch (err) {
    console.warn('createPatchwork failed', err.message);
    return null;
  }
}

async function multiCrop(file, baseName, destDir, rng, ext) {
  const outputs = [];
  try {
    const meta = await sharp(file).metadata();
    const crops = 3;
    for (let i = 0; i < crops; i++) {
      const w = Math.max(32, Math.floor(meta.width * (0.3 + rng())));
      const h = Math.max(32, Math.floor(meta.height * (0.3 + rng())));
      const left = Math.max(0, Math.floor((meta.width - w) * rng()));
      const top = Math.max(0, Math.floor((meta.height - h) * rng()));
      const dest = path.join(destDir, `${baseName}-crop${i}${ext}`);
      await sharp(file).extract({ width: w, height: h, left, top }).toFile(dest);
      outputs.push(dest);
    }
  } catch (err) {
    console.warn('multiCrop failed', err.message);
  }
  return outputs;
}

async function applyScribbleMask(file, dest) {
  try {
    const meta = await sharp(file).metadata();
    const canvas = createCanvas(meta.width, meta.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, meta.width, meta.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = Math.max(3, Math.min(meta.width, meta.height) * 0.03);
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * meta.width, Math.random() * meta.height);
      for (let j = 0; j < 5; j++) {
        ctx.lineTo(Math.random() * meta.width, Math.random() * meta.height);
      }
      ctx.stroke();
    }
    const maskBuffer = canvas.toBuffer('image/png');
    await sharp(file).composite([{ input: maskBuffer, blend: 'dest-in' }]).toFile(dest);
    return dest;
  } catch (err) {
    console.warn('applyScribbleMask failed', err.message);
    return null;
  }
}

async function blendWithRandomTexture(file, dest, rng) {
  try {
    const textures = await findImages();
    if (!textures.length) return null;
    const randomFile = textures[Math.floor(rng() * textures.length)];
    const base = sharp(file);
    const { width, height } = await base.metadata();
    const textureBuffer = await sharp(randomFile).resize(width, height, { fit: 'cover' }).toBuffer();
    await base.composite([{ input: textureBuffer, blend: 'multiply', opacity: 0.5 }]).toFile(dest);
    return dest;
  } catch (err) {
    console.warn('blendWithRandomTexture failed', err.message);
    return null;
  }
}

async function generateStyleVariations(file, baseName) {
  const destDir = path.join(OUTPUT_ROOT, 'variations', 'styles');
  const ext = path.extname(file);
  const outputs = [];
  const baseOutput = (label) => path.join(destDir, `${baseName}-${label}${ext}`);
  const image = await loadImage(file);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const originalData = ctx.getImageData(0, 0, image.width, image.height);

  const filters = {
    grayscale: (data) => applyPerPixel(data, (r, g, b, a) => {
      const v = 0.299 * r + 0.587 * g + 0.114 * b;
      return [v, v, v, a];
    }),
    invert: (data) => applyPerPixel(data, (r, g, b, a) => [255 - r, 255 - g, 255 - b, a]),
    duotone: (data) => applyPerPixel(data, (r, g, b, a) => {
      const intensity = (r + g + b) / 3 / 255;
      const dark = [10, 30, 90];
      const light = [240, 230, 200];
      return [
        dark[0] + (light[0] - dark[0]) * intensity,
        dark[1] + (light[1] - dark[1]) * intensity,
        dark[2] + (light[2] - dark[2]) * intensity,
        a
      ];
    }),
    photocopy: (data) => applyPerPixel(data, (r, g, b, a) => {
      const v = (r + g + b) / 3 > 140 ? 255 : 0;
      return [v, v, v, a];
    }),
    blueprint: (data) => applyPerPixel(data, (r, g, b, a) => {
      const v = (r + g + b) / 3;
      return [v * 0.2, v * 0.5, 180 + v * 0.2, a];
    }),
    glitch: (data) => rgbShift(data, 8, 0),
    vhs: (data) => rgbShift(data, 4, 2),
    watercolor: (data) => blurData(data, image.width, image.height, 2),
    posterize: (data) => applyPerPixel(data, (r, g, b, a) => [
      Math.round(r / 64) * 64,
      Math.round(g / 64) * 64,
      Math.round(b / 64) * 64,
      a
    ]),
    emboss: (data) => embossData(data, image.width, image.height),
    halftone: (data) => halftoneData(data, image.width, image.height)
  };

  for (const [label, fn] of Object.entries(filters)) {
    const dataCopy = new ImageData(new Uint8ClampedArray(originalData.data), image.width, image.height);
    const result = fn(dataCopy);
    ctx.putImageData(result, 0, 0);
    const dest = baseOutput(label);
    await fs.writeFile(dest, canvas.toBuffer());
    outputs.push(dest);
  }

  return outputs;
}

function applyPerPixel(imageData, fn) {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = fn(data[i], data[i + 1], data[i + 2], data[i + 3]);
    data[i] = clamp(r); data[i + 1] = clamp(g); data[i + 2] = clamp(b); data[i + 3] = clamp(a);
  }
  return imageData;
}

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function rgbShift(imageData, offsetR, offsetB) {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const rIdx = (y * width + Math.max(0, x - offsetR)) * 4;
      const bIdx = (y * width + Math.min(width - 1, x + offsetB)) * 4;
      output[idx] = data[rIdx];
      output[idx + 1] = data[idx + 1];
      output[idx + 2] = data[bIdx + 2];
      output[idx + 3] = data[idx + 3];
    }
  }
  return new ImageData(output, width, height);
}

function blurData(imageData, width, height, radius) {
  const { data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, c = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          const idx = (ny * width + nx) * 4;
          r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; a += data[idx + 3]; c++;
        }
      }
      const outIdx = (y * width + x) * 4;
      output[outIdx] = r / c;
      output[outIdx + 1] = g / c;
      output[outIdx + 2] = b / c;
      output[outIdx + 3] = a / c;
    }
  }
  return new ImageData(output, width, height);
}

function embossData(imageData, width, height) {
  const { data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const idx2 = (Math.min(height - 1, y + 1) * width + Math.min(width - 1, x + 1)) * 4;
      output[idx] = clamp(data[idx2] - data[idx] + 128);
      output[idx + 1] = clamp(data[idx2 + 1] - data[idx + 1] + 128);
      output[idx + 2] = clamp(data[idx2 + 2] - data[idx + 2] + 128);
      output[idx + 3] = data[idx + 3];
    }
  }
  return new ImageData(output, width, height);
}

function halftoneData(imageData, width, height) {
  const { data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  const radius = 3;
  for (let y = 0; y < height; y += radius * 2) {
    for (let x = 0; x < width; x += radius * 2) {
      let sum = 0, count = 0;
      for (let dy = 0; dy < radius * 2; dy++) {
        for (let dx = 0; dx < radius * 2; dx++) {
          const nx = Math.min(width - 1, x + dx);
          const ny = Math.min(height - 1, y + dy);
          const idx = (ny * width + nx) * 4;
          sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          count++;
        }
      }
      const intensity = sum / count / 255;
      const dotRadius = Math.max(1, Math.round(radius * intensity));
      for (let dy = -dotRadius; dy <= dotRadius; dy++) {
        for (let dx = -dotRadius; dx <= dotRadius; dx++) {
          if (dx * dx + dy * dy > dotRadius * dotRadius) continue;
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          const idx = (ny * width + nx) * 4;
          output[idx] = output[idx + 1] = output[idx + 2] = 30;
          output[idx + 3] = 255;
        }
      }
    }
  }
  for (let i = 0; i < data.length; i += 4) {
    if (output[i + 3] === 0) {
      output[i] = data[i];
      output[i + 1] = data[i + 1];
      output[i + 2] = data[i + 2];
      output[i + 3] = data[i + 3];
    }
  }
  return new ImageData(output, width, height);
}

async function generateWarpedVariations(file, baseName, rng) {
  const destDir = path.join(OUTPUT_ROOT, 'variations', 'warped');
  const ext = path.extname(file);
  const outputs = [];
  const labels = ['swirl', 'rippleH', 'rippleV', 'shear', 'liquify', 'noise'];
  const image = await loadImage(file);
  for (const label of labels) {
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, image.width, image.height);
    const warped = warpData(data, label, rng);
    ctx.putImageData(warped, 0, 0);
    const dest = path.join(destDir, `${baseName}-${label}${ext}`);
    await fs.writeFile(dest, canvas.toBuffer());
    outputs.push(dest);
  }
  return outputs;
}

function warpData(imageData, mode, rng) {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data.length);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let nx = x; let ny = y;
      if (mode === 'swirl') {
        const dx = x - centerX; const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) + (dist / radius) * Math.PI * 0.5;
        nx = centerX + dist * Math.cos(angle);
        ny = centerY + dist * Math.sin(angle);
      } else if (mode === 'rippleH') {
        nx = x + Math.sin(y / 10) * 5;
      } else if (mode === 'rippleV') {
        ny = y + Math.sin(x / 10) * 5;
      } else if (mode === 'shear') {
        nx = x + (y - centerY) * 0.2;
      } else if (mode === 'liquify') {
        nx = x + Math.sin((y + rng() * 10) / 8) * 3;
        ny = y + Math.cos((x + rng() * 10) / 8) * 3;
      } else if (mode === 'noise') {
        nx = x + (rng() - 0.5) * 4;
        ny = y + (rng() - 0.5) * 4;
      }
      const srcX = Math.min(width - 1, Math.max(0, Math.round(nx)));
      const srcY = Math.min(height - 1, Math.max(0, Math.round(ny)));
      const srcIdx = (srcY * width + srcX) * 4;
      const dstIdx = (y * width + x) * 4;
      output[dstIdx] = data[srcIdx];
      output[dstIdx + 1] = data[srcIdx + 1];
      output[dstIdx + 2] = data[srcIdx + 2];
      output[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return new ImageData(output, width, height);
}

async function generateCollageVariations(file, baseName, imageFiles, rng) {
  const destDir = path.join(OUTPUT_ROOT, 'variations', 'collage');
  const ext = path.extname(file);
  const outputs = [];
  const sourceImages = imageFiles.filter(f => f !== file);
  const partner = sourceImages.length ? sourceImages[Math.floor(rng() * sourceImages.length)] : null;
  const baseImage = await loadImage(file);
  const canvas = createCanvas(baseImage.width, baseImage.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(baseImage, 0, 0);

  // overlay shapes and textures
  ctx.globalAlpha = 0.6;
  ctx.globalCompositeOperation = 'multiply';
  if (partner) {
    const overlay = await loadImage(partner);
    ctx.drawImage(overlay, 0, 0, baseImage.width, baseImage.height);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = Math.max(2, Math.min(baseImage.width, baseImage.height) * 0.02);
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * baseImage.width, Math.random() * baseImage.height);
    for (let j = 0; j < 3; j++) {
      ctx.lineTo(Math.random() * baseImage.width, Math.random() * baseImage.height);
    }
    ctx.stroke();
  }
  const dest1 = path.join(destDir, `${baseName}-overlay${ext}`);
  await fs.writeFile(dest1, canvas.toBuffer());
  outputs.push(dest1);

  // multiply blending two random marks (use partner if available)
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.7;
  if (partner) {
    const overlay = await loadImage(partner);
    ctx.drawImage(overlay, 0, 0, baseImage.width, baseImage.height);
  }
  const dest2 = path.join(destDir, `${baseName}-multiply${ext}`);
  await fs.writeFile(dest2, canvas.toBuffer());
  outputs.push(dest2);

  // silhouette cut-out
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.beginPath();
  ctx.arc(baseImage.width / 2, baseImage.height / 2, Math.min(baseImage.width, baseImage.height) / 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  const dest3 = path.join(destDir, `${baseName}-silhouette${ext}`);
  await fs.writeFile(dest3, canvas.toBuffer());
  outputs.push(dest3);

  return outputs;
}

async function generatePatternVariations(file, baseName, rng) {
  const destDir = path.join(OUTPUT_ROOT, 'variations', 'patterns');
  const ext = path.extname(file);
  const outputs = [];
  const tileable = await isTileable(file);
  const targetSize = 450;
  const base = await sharp(file).resize(targetSize, targetSize, { fit: 'cover' }).toBuffer();

  const repeatDest = path.join(destDir, `${baseName}-repeat${ext}`);
  await sharp({ create: { width: targetSize * 2, height: targetSize * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: base, left: 0, top: 0 },
      { input: base, left: targetSize, top: 0 },
      { input: base, left: 0, top: targetSize },
      { input: base, left: targetSize, top: targetSize }
    ])
    .toFile(repeatDest);
  outputs.push(repeatDest);

  const mirrorDest = path.join(destDir, `${baseName}-mirror${ext}`);
  const mirrored = await sharp(base).flip().flop().toBuffer();
  await sharp({ create: { width: targetSize * 2, height: targetSize * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: base, left: 0, top: 0 },
      { input: mirrored, left: targetSize, top: 0 },
      { input: mirrored, left: 0, top: targetSize },
      { input: base, left: targetSize, top: targetSize }
    ])
    .toFile(mirrorDest);
  outputs.push(mirrorDest);

  const kaleidoDest = path.join(destDir, `${baseName}-kaleido${ext}`);
  await sharp(base).affine([[1, 0], [0, -1]], { background: 'transparent' }).toFile(kaleidoDest);
  outputs.push(kaleidoDest);

  const noiseDest = path.join(destDir, `${baseName}-noise${ext}`);
  const noiseOverlay = await sharp({ create: { width: targetSize, height: targetSize, channels: 1, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .raw().toBuffer({ resolveWithObject: true });
  const noiseBuffer = noiseOverlay.data;
  for (let i = 0; i < noiseBuffer.length; i++) {
    noiseBuffer[i] = clamp(255 * rng());
  }
  await sharp(base)
    .composite([{ input: Buffer.from(noiseBuffer), raw: { width: targetSize, height: targetSize, channels: 1 }, blend: 'overlay' }])
    .toFile(noiseDest);
  outputs.push(noiseDest);

  if (tileable) outputs.push(repeatDest);
  return Array.from(new Set(outputs));
}

async function isTileable(file) {
  try {
    const { data, info } = await sharp(file).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const width = info.width;
    const height = info.height;
    const line = info.channels;
    const left = new Uint8Array(height * line);
    const right = new Uint8Array(height * line);
    for (let y = 0; y < height; y++) {
      const idxLeft = (y * width) * line;
      const idxRight = (y * width + width - 1) * line;
      for (let c = 0; c < line; c++) {
        left[y * line + c] = data[idxLeft + c];
        right[y * line + c] = data[idxRight + c];
      }
    }
    const mismatch = pixelmatch(left, right, null, line, height, { threshold: 0.2 });
    return mismatch < height * line * 0.3;
  } catch (err) {
    console.warn('isTileable failed', err.message);
    return false;
  }
}

async function vectorizeEdge(file, baseName) {
  try {
    const svgDest = path.join(OUTPUT_ROOT, 'variations', 'styles', `${baseName}-edge.svg`);
    const trace = new potrace.Potrace();
    const svg = await new Promise((resolve, reject) => {
      trace.loadImage(file, err => {
        if (err) return reject(err);
        trace.setParameter({ threshold: 180 });
        trace.getSVG((err2, svgData) => {
          if (err2) return reject(err2);
          resolve(svgData);
        });
      });
    });
    await fs.writeFile(svgDest, svg, 'utf8');
    return svgDest;
  } catch (err) {
    console.warn('vectorizeEdge failed', err.message);
    return null;
  }
}

async function vectorizeSilhouette(file, baseName, hasAlpha) {
  if (!hasAlpha) return null;
  try {
    const svgDest = path.join(OUTPUT_ROOT, 'variations', 'styles', `${baseName}-silhouette.svg`);
    const params = { turnPolicy: potrace.TURNPOLICY_MINORITY, threshold: 100, blackOnWhite: true };
    const svg = await new Promise((resolve, reject) => {
      potrace.trace(file, params, (err, svgData) => {
        if (err) return reject(err);
        resolve(svgData);
      });
    });
    await fs.writeFile(svgDest, svg, 'utf8');
    return svgDest;
  } catch (err) {
    console.warn('vectorizeSilhouette failed', err.message);
    return null;
  }
}

async function writeManifest(entries) {
  const manifestPath = path.join(OUTPUT_ROOT, 'asset-map.json');
  await fs.writeJson(manifestPath, entries, { spaces: 2 });
  console.log('Manifest written to', manifestPath);
}

main();
