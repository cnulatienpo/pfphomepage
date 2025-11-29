import { loadShot } from './lidarEngine.js';

function resolveManager(options) {
  return options?.layerManager || window?.layerManager;
}

function layersForShot(layerManager, shotId) {
  return layerManager.layers.filter((layer) => layer.depthMeta?.shotId === shotId);
}

function applyFilterUpdates(layerManager, layer, updates) {
  const current = layer.filter || {};
  layerManager.updateLayer(layer.id, { filter: { ...current, ...updates } });
}

export async function applyDepthShading(shotId, options = {}) {
  const layerManager = resolveManager(options);
  if (!layerManager) return;
  await loadShot(shotId);
  const layers = layersForShot(layerManager, shotId);
  const darkness = options.intensity ?? 14;
  const glow = options.glow ?? 6;
  layers.forEach((layer) => {
    const depth = layer.depthMeta?.normalizedRange?.[0] ?? 0.5;
    const dim = 100 - depth * darkness;
    const saturation = 100 - depth * (darkness / 2);
    applyFilterUpdates(layerManager, layer, {
      brightness: dim,
      saturation,
      contrast: 105,
      hue: 0,
    });
    if (depth < 0.2) {
      applyFilterUpdates(layerManager, layer, { blur: 0, opacity: 100 });
      layer.glow = glow;
    }
  });
}

export async function applyDepthOfField(shotId, options = {}) {
  const layerManager = resolveManager(options);
  if (!layerManager) return;
  await loadShot(shotId);
  const layers = layersForShot(layerManager, shotId);
  const strength = options.strength ?? 18;
  layers.forEach((layer) => {
    const depth = layer.depthMeta?.normalizedRange?.[0] ?? 0.5;
    const blur = Math.max(0, (depth - 0.25) * strength);
    applyFilterUpdates(layerManager, layer, { blur });
  });
}

export async function applyDepthEmboss(shotId, options = {}) {
  const layerManager = resolveManager(options);
  if (!layerManager) return;
  await loadShot(shotId);
  const layers = layersForShot(layerManager, shotId);
  const relief = options.relief ?? 18;
  layers.forEach((layer) => {
    const depth = layer.depthMeta?.normalizedRange?.[0] ?? 0.5;
    const embossBoost = 100 + (0.5 - depth) * relief;
    applyFilterUpdates(layerManager, layer, {
      contrast: embossBoost,
      brightness: 102,
      saturation: 104,
    });
    layer.blendMode = 'overlay';
  });
}

export async function applyDepthColorRamp(shotId, options = {}) {
  const layerManager = resolveManager(options);
  if (!layerManager) return;
  await loadShot(shotId);
  const nearColor = options.nearColor || 'var(--amber-300, #fcd34d)';
  const farColor = options.farColor || 'var(--sky-400, #38bdf8)';
  const layers = layersForShot(layerManager, shotId);

  layers.forEach((layer) => {
    const depth = layer.depthMeta?.normalizedRange?.[0] ?? 0.5;
    const overlay = document.createElement('div');
    overlay.className = 'depth-color-ramp';
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.mixBlendMode = 'soft-light';
    overlay.style.pointerEvents = 'none';
    overlay.style.background = `linear-gradient(180deg, ${nearColor} ${Math.round((1 - depth) * 100)}%, ${farColor})`;
    layer.rampOverlay = overlay.outerHTML;
  });
}
