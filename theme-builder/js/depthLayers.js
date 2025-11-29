import { loadShot } from './lidarEngine.js';
import { registerLidarLayer } from './lidarInspector.js';

function resolveManager(options) {
  return options?.layerManager || window?.layerManager;
}

function computeSliceRanges(numSlices) {
  const slices = [];
  const step = 1 / numSlices;
  for (let i = 0; i < numSlices; i += 1) {
    slices.push([i * step, (i + 1) * step]);
  }
  return slices;
}

export async function createDepthLayersForShot(shotId, options = {}) {
  const layerManager = resolveManager(options);
  if (!layerManager) throw new Error('Layer manager missing for depth layer creation');
  const { numSlices = 3, minDepth = 0, maxDepth = 1, maskFeather = 0 } = options;
  const shot = await loadShot(shotId);
  const slices = computeSliceRanges(Math.min(Math.max(numSlices, 3), 7));
  const names = ['Foreground', 'Mid', 'Background', 'Slice 4', 'Slice 5', 'Slice 6', 'Slice 7'];

  const baseX = 200;
  const baseY = 160;
  const created = [];
  slices.forEach((range, index) => {
    const src =
      shot.meta.parallaxLayers?.[index] ||
      shot.meta.parallaxLayers?.at?.(-1) ||
      shot.meta.depthMap ||
      shot.meta.sourceColor;
    const depthLabel = names[index] || `Slice ${index + 1}`;
    const layer = layerManager.createLayer({
      name: `LiDAR – ${depthLabel}`,
      src,
      x: baseX + index * 24,
      y: baseY + index * 12,
      width: shot.meta.width,
      height: shot.meta.height,
      placeholder: false,
      depthMeta: {
        shotId,
        sliceIndex: index,
        normalizedRange: range,
        maskFeather,
        depthMeters: [minDepth, maxDepth],
        label: depthLabel,
      },
    });
    registerLidarLayer(layer.id, shotId, { range, label: depthLabel });
    created.push(layer);
  });
  return created;
}
