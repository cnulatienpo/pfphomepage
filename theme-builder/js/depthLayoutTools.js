import { loadShot } from './lidarEngine.js';
import { createDepthLayersForShot } from './depthLayers.js';
import { applyDepthShading, applyDepthOfField } from './depthEffects.js';
import { registerLidarLayer } from './lidarInspector.js';

function resolveManager(options) {
  return options?.layerManager || window?.layerManager;
}

function findForegroundLayer(layerManager, shotId) {
  return layerManager.layers.find((l) => l.depthMeta?.shotId === shotId && l.depthMeta.sliceIndex === 0);
}

export async function createHeroCardFromShot(shotId, options = {}) {
  const layerManager = resolveManager(options);
  if (!layerManager) return null;
  await createDepthLayersForShot(shotId, { ...options, numSlices: 3, layerManager });
  const hero = findForegroundLayer(layerManager, shotId);
  if (hero) {
    layerManager.updateLayer(hero.id, {
      name: 'LiDAR – Hero Card',
      blendMode: 'screen',
      sticker: 'hero',
      width: hero.width * 0.7,
      height: hero.height * 0.7,
    });
  }
  applyDepthShading(shotId, { layerManager, intensity: 12 });
  applyDepthOfField(shotId, { layerManager, strength: 20 });
  return hero;
}

export async function addScribblesBehindSubject(shotId, options = {}) {
  const layerManager = resolveManager(options);
  if (!layerManager) return null;
  await loadShot(shotId);
  const fg = findForegroundLayer(layerManager, shotId);
  if (!fg) return null;
  const scribble = layerManager.createLayer({
    name: 'Depth Scribbles',
    x: fg.x - 16,
    y: fg.y - 12,
    width: fg.width + 32,
    height: fg.height + 24,
    blendMode: 'multiply',
    placeholder: true,
    depthMeta: { shotId, sliceIndex: fg.depthMeta?.sliceIndex ?? 0.5, normalizedRange: [0.3, 0.6] },
  });
  registerLidarLayer(scribble.id, shotId, { label: 'Scribbles' });
  layerManager.moveLayer(scribble.id, -1);
  return scribble;
}

export async function autoScaffoldFromDepthEdges(shotId, options = {}) {
  const layerManager = resolveManager(options);
  if (!layerManager) return [];
  await createDepthLayersForShot(shotId, { ...options, numSlices: 4, layerManager });
  const beams = ['Beam A', 'Beam B', 'Beam C'].map((name, idx) =>
    layerManager.createLayer({
      name: `Depth Beam ${idx + 1}`,
      width: 480,
      height: 40,
      x: 120 + idx * 40,
      y: 80 + idx * 60,
      blendMode: 'overlay',
      placeholder: true,
      sticker: 'beam',
      depthMeta: { shotId, sliceIndex: idx, normalizedRange: [0.2 * idx, 0.2 * idx + 0.25] },
    }),
  );
  beams.forEach((beam) => registerLidarLayer(beam.id, shotId, { label: 'Scaffold Beam' }));
  return beams;
}

export async function groupLayersByDepth(shotId, options = {}) {
  const layerManager = resolveManager(options);
  if (!layerManager) return [];
  const layers = layerManager.layers.filter((l) => l.depthMeta?.shotId === shotId);
  const sorted = layers.sort((a, b) => (a.depthMeta?.normalizedRange?.[0] ?? 0) - (b.depthMeta?.normalizedRange?.[0] ?? 0));
  sorted.forEach((layer, idx) => {
    layerManager.moveLayer(layer.id, idx - layerManager.layers.indexOf(layer));
  });
  return sorted;
}

export async function applySubjectSpotlight(shotId, options = {}) {
  const layerManager = resolveManager(options);
  if (!layerManager) return;
  const layers = layerManager.layers.filter((l) => l.depthMeta?.shotId === shotId);
  const cutoff = options.cutoff ?? 0.45;
  layers.forEach((layer) => {
    const depth = layer.depthMeta?.normalizedRange?.[0] ?? 0.5;
    const opacity = depth > cutoff ? 80 : 100;
    const blur = depth > cutoff ? 6 : 0;
    const brightness = depth > cutoff ? 80 : 110;
    layerManager.updateLayer(layer.id, {
      filter: { ...layer.filter, opacity, blur, brightness },
      sticker: depth > cutoff ? 'bg' : 'hero',
    });
  });
}
