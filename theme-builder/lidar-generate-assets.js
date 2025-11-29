import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SHOTS_DIR = path.join(__dirname, 'assets', 'lidar-shots');
const OUTPUT_ROOT = path.join(__dirname, 'visual-assets', 'lidar');
const OUTPUT_FOLDERS = ['depth-maps', 'segments', 'normals', 'parallax-layers'];

const COLOR_EXTS = ['.jpg', '.jpeg', '.png'];
const DEPTH_EXTS = ['.depth.png', '.depth.tiff', '.depth.tif', '.depth.jpg', '.depth.jpeg'];

async function ensureStructure() {
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  for (const folder of OUTPUT_FOLDERS) {
    await fs.mkdir(path.join(OUTPUT_ROOT, folder), { recursive: true });
  }
}

function baseNameFor(file) {
  const parsed = path.parse(file);
  const name = parsed.name.replace(/\.depth$/, '').replace(/\.meta$/, '');
  return name;
}

async function discoverShots() {
  const entries = await fs.readdir(SHOTS_DIR, { withFileTypes: true }).catch(() => []);
  const map = new Map();
  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    const base = baseNameFor(entry.name);
    const shot = map.get(base) || { id: base };
    const fullPath = path.join(SHOTS_DIR, entry.name);
    if (COLOR_EXTS.includes(ext)) {
      shot.color = fullPath;
    } else if (DEPTH_EXTS.includes(ext)) {
      shot.depth = fullPath;
    } else if (ext === '.json' && !entry.name.endsWith('.meta.json')) {
      shot.depthJson = fullPath;
    } else if (entry.name.endsWith('.meta.json')) {
      shot.meta = fullPath;
    }
    map.set(base, shot);
  }
  return Array.from(map.values()).filter((s) => s.color && (s.depth || s.depthJson));
}

async function loadDepthFromJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    const size = Math.sqrt(parsed.length);
    return { width: size, height: size, values: Float32Array.from(parsed) };
  }
  if (parsed?.data && parsed.width && parsed.height) {
    return { width: parsed.width, height: parsed.height, values: Float32Array.from(parsed.data) };
  }
  throw new Error(`Unsupported depth JSON format at ${filePath}`);
}

async function loadDepthImage(filePath) {
  const image = sharp(filePath);
  const meta = await image.metadata();
  const { width = 0, height = 0, channels = 1, depth = 'uchar' } = meta;
  const pixelDepth = depth === 'ushort' ? 2 : 1;
  const raw = await image.raw({ depth }).toBuffer();
  const TypedArray = depth === 'ushort' ? Uint16Array : Uint8Array;
  const data = new TypedArray(raw.buffer);
  const values = new Float32Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    values[i] = data[i * channels];
  }
  const maxPossible = depth === 'ushort' ? 65535 : 255;
  return { width, height, values, maxPossible, pixelDepth };
}

function computeStats(values) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v <= 0) continue;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  return { min, max, range: Math.max(max - min, 1e-3) };
}

function normalizeDepth(values, width, height, stats, maxPossible = 65535) {
  const normalized = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const v = values[i];
    const clamped = Math.max(stats.min, Math.min(stats.max, v));
    const unit = (clamped - stats.min) / stats.range;
    normalized[i] = Math.round(unit * 255);
  }
  return normalized;
}

function maskForRange(normalized, width, height, start, end) {
  const mask = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const unit = normalized[i] / 255;
    mask[i] = unit >= start && unit <= end ? 255 : 0;
  }
  return mask;
}

async function writeMask(mask, width, height, outputPath) {
  const buffer = Buffer.from(mask.buffer, mask.byteOffset, mask.byteLength);
  await sharp(buffer, { raw: { width, height, channels: 1 } }).png().toFile(outputPath);
}

function computeNormals(normalized, width, height) {
  const normals = new Uint8ClampedArray(width * height * 3);
  const get = (x, y) => normalized[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))] / 255;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dzdx = get(x + 1, y) - get(x - 1, y);
      const dzdy = get(x, y + 1) - get(x, y - 1);
      let nx = -dzdx;
      let ny = -dzdy;
      let nz = 1;
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= length;
      ny /= length;
      nz /= length;
      const idx = (y * width + x) * 3;
      normals[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      normals[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normals[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    }
  }
  return normals;
}

async function compositeColorLayer(colorPath, mask, width, height, outputPath) {
  const maskBuffer = Buffer.from(mask.buffer, mask.byteOffset, mask.byteLength);
  const base = sharp(colorPath).resize(width, height, { fit: 'cover' }).ensureAlpha();
  const layer = await base
    .composite([
      {
        input: maskBuffer,
        raw: { width, height, channels: 1 },
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();
  await sharp(layer).png().toFile(outputPath);
}

async function processShot(shot) {
  const sourceDepthPath = shot.depth || shot.depthJson;
  let depthData;
  if (shot.depthJson) {
    depthData = await loadDepthFromJson(shot.depthJson);
  } else {
    depthData = await loadDepthImage(shot.depth);
  }
  const { width, height, values, maxPossible = 65535 } = depthData;
  const stats = computeStats(values);
  const normalized = normalizeDepth(values, width, height, stats, maxPossible);

  const depthMapPath = path.join(OUTPUT_ROOT, 'depth-maps', `${shot.id}_depth.png`);
  await sharp(Buffer.from(normalized.buffer), { raw: { width, height, channels: 1 } }).png().toFile(depthMapPath);

  const segments = {
    fg: path.join(OUTPUT_ROOT, 'segments', `${shot.id}_fg.png`),
    mid: path.join(OUTPUT_ROOT, 'segments', `${shot.id}_mid.png`),
    bg: path.join(OUTPUT_ROOT, 'segments', `${shot.id}_bg.png`),
  };

  const sliceRanges = [
    [0, 0.33],
    [0.33, 0.66],
    [0.66, 1],
  ];

  const fgMask = maskForRange(normalized, width, height, sliceRanges[0][0], sliceRanges[0][1]);
  const midMask = maskForRange(normalized, width, height, sliceRanges[1][0], sliceRanges[1][1]);
  const bgMask = maskForRange(normalized, width, height, sliceRanges[2][0], sliceRanges[2][1]);

  await Promise.all([
    writeMask(fgMask, width, height, segments.fg),
    writeMask(midMask, width, height, segments.mid),
    writeMask(bgMask, width, height, segments.bg),
  ]);

  const normals = computeNormals(normalized, width, height);
  const normalPath = path.join(OUTPUT_ROOT, 'normals', `${shot.id}_normals.png`);
  await sharp(Buffer.from(normals.buffer), { raw: { width, height, channels: 3 } }).png().toFile(normalPath);

  const parallaxLayers = [];
  const ranges = sliceRanges;
  const color = shot.color;
  await compositeColorLayer(color, fgMask, width, height, path.join(OUTPUT_ROOT, 'parallax-layers', `${shot.id}_layer0.png`));
  await compositeColorLayer(color, midMask, width, height, path.join(OUTPUT_ROOT, 'parallax-layers', `${shot.id}_layer1.png`));
  await compositeColorLayer(color, bgMask, width, height, path.join(OUTPUT_ROOT, 'parallax-layers', `${shot.id}_layer2.png`));
  parallaxLayers.push(
    `visual-assets/lidar/parallax-layers/${shot.id}_layer0.png`,
    `visual-assets/lidar/parallax-layers/${shot.id}_layer1.png`,
    `visual-assets/lidar/parallax-layers/${shot.id}_layer2.png`,
  );

  return {
    id: shot.id,
    sourceColor: path.relative(__dirname, shot.color).replace(/\\/g, '/'),
    sourceDepth: path.relative(__dirname, sourceDepthPath).replace(/\\/g, '/'),
    width,
    height,
    depthRange: [Number((stats.min / 1000).toFixed(3)), Number((stats.max / 1000).toFixed(3))],
    segments: {
      foregroundMask: 'visual-assets/lidar/segments/' + path.basename(segments.fg),
      midgroundMask: 'visual-assets/lidar/segments/' + path.basename(segments.mid),
      backgroundMask: 'visual-assets/lidar/segments/' + path.basename(segments.bg),
    },
    normals: 'visual-assets/lidar/normals/' + path.basename(normalPath),
    depthMap: 'visual-assets/lidar/depth-maps/' + path.basename(depthMapPath),
    parallaxLayers,
  };
}

async function main() {
  await ensureStructure();
  const shots = await discoverShots();
  if (!shots.length) {
    console.log('No LiDAR captures found in /assets/lidar-shots.');
    return;
  }
  const results = [];
  for (const shot of shots) {
    try {
      console.log('Processing', shot.id);
      const processed = await processShot(shot);
      results.push(processed);
    } catch (error) {
      console.warn(`Skipping ${shot.id}:`, error.message);
    }
  }
  const metadata = { generatedAt: new Date().toISOString(), shots: results };
  await fs.writeFile(path.join(OUTPUT_ROOT, 'metadata.json'), JSON.stringify(metadata, null, 2));
  console.log('LiDAR metadata written to visual-assets/lidar/metadata.json');
}

if (import.meta.url === `file://${__filename}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
