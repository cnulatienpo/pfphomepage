import { loadShot } from './lidarEngine.js';

let activeListener = null;
let parallaxState = null;

function resolveManager(options) {
  return options?.layerManager || window?.layerManager;
}

function collectLayersForShot(shotId, layerManager) {
  return layerManager.layers.filter((layer) => layer.depthMeta?.shotId === shotId);
}

function scheduleFrame() {
  if (!parallaxState || parallaxState.pending) return;
  parallaxState.pending = true;
  requestAnimationFrame(() => {
    applyParallax(parallaxState.lastVector || { x: 0, y: 0 });
    parallaxState.pending = false;
  });
}

function applyParallax(vector) {
  if (!parallaxState) return;
  const { layers, layerManager, intensity, axis } = parallaxState;
  layers.forEach((layer) => {
    const depth = 1 - (layer.depthMeta?.normalizedRange?.[0] ?? 0.5);
    const factor = depth * intensity;
    const offset = {
      x: axis === 'y' ? 0 : vector.x * factor,
      y: axis === 'x' ? 0 : vector.y * factor,
    };
    const base = parallaxState.originalTransforms.get(layer.id) || { x: 0, y: 0 };
    layerManager.updateLayer(layer.id, {
      transform: {
        ...layer.transform,
        x: base.x + offset.x,
        y: base.y + offset.y,
      },
    });
  });
}

export async function attachParallaxToShot(shotId, canvasElement, options = {}) {
  const layerManager = resolveManager(options);
  if (!layerManager) throw new Error('Layer manager missing for parallax');
  const shot = await loadShot(shotId);
  const layers = collectLayersForShot(shotId, layerManager);
  if (!layers.length) {
    console.warn('No layers found for parallax. Create depth layers first.');
    return;
  }
  const intensity = options.intensity ?? 18;
  const axis = options.axis || 'both';
  const easing = options.easing || 0.15;

  const originalTransforms = new Map();
  layers.forEach((layer) => {
    originalTransforms.set(layer.id, { x: layer.transform?.x || 0, y: layer.transform?.y || 0 });
  });

  const state = {
    shot,
    layers,
    layerManager,
    intensity,
    axis,
    easing,
    originalTransforms,
    lastVector: { x: 0, y: 0 },
    pending: false,
    canvasElement,
  };

  const handler = (evt) => {
    const rect = canvasElement.getBoundingClientRect();
    const normX = ((evt.clientX - rect.left) / rect.width - 0.5) * 2;
    const normY = ((evt.clientY - rect.top) / rect.height - 0.5) * 2;
    state.lastVector = {
      x: normX * easing,
      y: normY * easing,
    };
    scheduleFrame();
  };

  detachParallax();
  parallaxState = state;
  activeListener = handler;
  canvasElement.addEventListener('pointermove', handler);
  const wheelHandler = (evt) => {
    state.lastVector = {
      x: axis === 'y' ? 0 : (evt.deltaX / 200) * easing,
      y: axis === 'x' ? 0 : (evt.deltaY / 200) * easing,
    };
    scheduleFrame();
  };
  state.wheelHandler = wheelHandler;
  canvasElement.addEventListener('wheel', wheelHandler);
}

export function detachParallax() {
  if (activeListener && parallaxState?.canvasElement) {
    parallaxState.canvasElement.removeEventListener('pointermove', activeListener);
  }
  if (parallaxState?.wheelHandler && parallaxState.canvasElement) {
    parallaxState.canvasElement.removeEventListener('wheel', parallaxState.wheelHandler);
  }
  parallaxState = null;
  activeListener = null;
}
