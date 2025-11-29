const METADATA_URL = 'visual-assets/lidar/metadata.json';

let metadataCache = null;
const shotCache = new Map();
const depthCanvases = new Map();

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function makeAbsolute(src) {
  if (!src) return src;
  if (src.startsWith('http') || src.startsWith('/')) return src;
  return `${window.location.origin}/${src}`;
}

export async function loadLidarMetadata() {
  if (metadataCache) return metadataCache;
  try {
    const response = await fetch(METADATA_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error('Missing LiDAR metadata. Run lidar-generate-assets.js');
    metadataCache = await response.json();
    return metadataCache;
  } catch (error) {
    console.warn('Unable to load LiDAR metadata', error);
    metadataCache = { shots: [] };
    return metadataCache;
  }
}

export async function getShotList() {
  const meta = await loadLidarMetadata();
  return meta?.shots || [];
}

async function ensureDepthCanvas(shotId, depthMap) {
  if (depthCanvases.has(shotId)) return depthCanvases.get(shotId);
  const canvas = document.createElement('canvas');
  canvas.width = depthMap.naturalWidth || depthMap.width;
  canvas.height = depthMap.naturalHeight || depthMap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(depthMap, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const info = { canvas, ctx, data };
  depthCanvases.set(shotId, info);
  return info;
}

export async function loadShot(id) {
  const meta = await loadLidarMetadata();
  const shot = meta.shots?.find((s) => s.id === id);
  if (!shot) throw new Error(`Shot ${id} not found`);
  if (shotCache.has(id)) return shotCache.get(id);

  const parallaxList = shot.parallaxLayers || [];
  const [image, depthMap, fgMask, midMask, bgMask, normals, ...parallaxLayers] = await Promise.all([
    loadImage(makeAbsolute(shot.sourceColor)),
    loadImage(makeAbsolute(shot.depthMap)),
    loadImage(makeAbsolute(shot.segments?.foregroundMask)),
    loadImage(makeAbsolute(shot.segments?.midgroundMask)),
    loadImage(makeAbsolute(shot.segments?.backgroundMask)),
    loadImage(makeAbsolute(shot.normals)),
    ...parallaxList.map((p) => loadImage(makeAbsolute(p))),
  ]);

  const depthInfo = await ensureDepthCanvas(id, depthMap);
  const loaded = {
    meta: shot,
    image,
    depthMap,
    masks: {
      foreground: fgMask,
      midground: midMask,
      background: bgMask,
    },
    normals,
    parallaxLayers,
    depthInfo,
  };
  shotCache.set(id, loaded);
  return loaded;
}

export function sampleDepthAt(shotId, x, y) {
  const cached = shotCache.get(shotId);
  if (!cached) return null;
  const { data, canvas } = cached.depthInfo || {};
  if (!data) return null;
  const clampedX = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
  const clampedY = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
  const idx = (clampedY * canvas.width + clampedX) * 4;
  const value = data.data[idx];
  const [near, far] = cached.meta.depthRange || [0, 1];
  const depthMeters = near + ((value / 255) * (far - near));
  return { normalized: value / 255, depthMeters };
}
