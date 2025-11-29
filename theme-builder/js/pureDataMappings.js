import { getChannelValue, sendToPureData } from './pureDataEngine.js';

export const THEME_TARGETS = [
  { id: 'color.bgHue', label: 'Background Hue' },
  { id: 'color.accentSaturation', label: 'Accent Saturation' },
  { id: 'parallax.intensity', label: 'Parallax Intensity' },
  { id: 'blur.amount', label: 'Global Blur' },
  { id: 'grain.amount', label: 'Film Grain' },
  { id: 'layout.spacingScale', label: 'Spacing Scale' },
  { id: 'components.cardPulse', label: 'Card Pulse' },
  { id: 'components.modeBlend', label: 'Calm ↔ Chaotic Blend' },
];

export const THEME_EVENTS = [
  { id: 'toolbar_click', label: 'Toolbar Click' },
  { id: 'asset_drop', label: 'Asset Dropped' },
  { id: 'layer_focus', label: 'Layer Focus Change' },
  { id: 'export', label: 'Export Triggered' },
  { id: 'grid_toggle', label: 'Depth/Grid Toggle' },
];

let mappingContext = {
  canvasEngine: null,
  layerManager: null,
  overlay: null,
};

let mappings = [];
let mappingLoop = null;
const themeState = {
  bgHue: 0,
  accentSaturation: 1,
  blur: 0,
  grain: 0.25,
  spacingScale: 1,
  parallax: 0,
  cardPulse: 0,
  modeBlend: 0,
};

const eventBindings = new Map();

export function setMappingContext(context) {
  mappingContext = { ...mappingContext, ...context };
  commitVisualState();
}

export function createMapping(config) {
  const id = config.id || `map-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const mapping = {
    id,
    direction: config.direction || 'pd→theme',
    sourceChannel: config.sourceChannel || 'channel',
    targetProperty: config.targetProperty || 'color.bgHue',
    transform: {
      type: config.transform?.type || 'range',
      inMin: config.transform?.inMin ?? 0,
      inMax: config.transform?.inMax ?? 1,
      outMin: config.transform?.outMin ?? 0,
      outMax: config.transform?.outMax ?? 1,
      curve: config.transform?.curve || 'linear',
      smoothing: config.transform?.smoothing ?? 0,
    },
  };
  mappings.push(mapping);
  return mapping;
}

export function removeMapping(id) {
  mappings = mappings.filter((m) => m.id !== id);
}

export function listMappings() {
  return mappings;
}

export function applyMappings() {
  mappings
    .filter((m) => m.direction === 'pd→theme')
    .forEach((mapping) => {
      const raw = getChannelValue(mapping.sourceChannel, 0);
      const mapped = applyTransform(mapping, raw);
      applyTarget(mapping.targetProperty, mapped);
    });
}

export function routeThemeValue(sourceChannel, value = 1) {
  mappings
    .filter((m) => m.direction === 'theme→pd' && m.sourceChannel === sourceChannel)
    .forEach((mapping) => {
      const mapped = applyTransform(mapping, value);
      sendToPureData(mapping.targetProperty || mapping.sourceChannel, mapped);
    });
}

export function startMappingLoop() {
  if (mappingLoop) return;
  const tick = () => {
    applyMappings();
    mappingLoop = requestAnimationFrame(tick);
  };
  mappingLoop = requestAnimationFrame(tick);
}

export function stopMappingLoop() {
  if (mappingLoop) cancelAnimationFrame(mappingLoop);
  mappingLoop = null;
}

export function serializeMappings() {
  return { mappings };
}

export function loadMappingsFromJSON(json) {
  if (!json) return;
  mappings = Array.isArray(json.mappings) ? json.mappings : mappings;
}

export function setThemeEventChannel(eventId, channelName) {
  if (!channelName) {
    eventBindings.delete(eventId);
    return;
  }
  eventBindings.set(eventId, channelName);
}

export function getThemeEventChannel(eventId) {
  return eventBindings.get(eventId) || '';
}

export function triggerThemeEvent(eventId, payload = 1) {
  const boundChannel = eventBindings.get(eventId);
  if (boundChannel) {
    sendToPureData(boundChannel, payload);
  }
  routeThemeValue(eventId, payload);
}

function applyTransform(mapping, value) {
  const { inMin, inMax, outMin, outMax, curve, smoothing } = mapping.transform;
  const clamped = clamp01((value - inMin) / Math.max(0.0001, inMax - inMin));
  let scaled = outMin + (outMax - outMin) * shapeCurve(clamped, curve);
  if (smoothing > 0) {
    const alpha = clamp01(smoothing);
    scaled = mapping._lastValue !== undefined ? mapping._lastValue + (scaled - mapping._lastValue) * alpha : scaled;
    mapping._lastValue = scaled;
  }
  return scaled;
}

function shapeCurve(value, curve) {
  if (curve === 'exp') return value * value;
  if (curve === 'log') return Math.sqrt(value);
  return value;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function applyTarget(target, value) {
  switch (target) {
    case 'color.bgHue':
      themeState.bgHue = value * 360;
      break;
    case 'color.accentSaturation':
      themeState.accentSaturation = clamp01(value);
      break;
    case 'parallax.intensity':
      themeState.parallax = clamp01(value);
      break;
    case 'blur.amount':
      themeState.blur = Math.max(0, value * 12);
      break;
    case 'grain.amount':
      themeState.grain = clamp01(value);
      break;
    case 'layout.spacingScale':
      themeState.spacingScale = Math.max(0.6, value);
      break;
    case 'components.cardPulse':
      themeState.cardPulse = clamp01(value);
      break;
    case 'components.modeBlend':
      themeState.modeBlend = clamp01(value);
      break;
    default:
      break;
  }
  commitVisualState();
}

function commitVisualState() {
  const root = document.documentElement;
  root.style.setProperty('--pd-bg-hue', `${themeState.bgHue.toFixed(2)}deg`);
  root.style.setProperty('--pd-accent-sat', themeState.accentSaturation.toFixed(3));
  root.style.setProperty('--pd-blur', `${themeState.blur.toFixed(2)}px`);
  root.style.setProperty('--pd-grain', themeState.grain.toFixed(3));
  root.style.setProperty('--pd-spacing-scale', themeState.spacingScale.toFixed(2));
  root.style.setProperty('--pd-card-pulse', themeState.cardPulse.toFixed(3));
  root.dataset.pdMode = themeState.modeBlend > 0.55 ? 'chaotic' : 'calm';
  if (mappingContext.canvasEngine?.setParallaxIntensity) {
    mappingContext.canvasEngine.setParallaxIntensity(themeState.parallax);
  }
  if (mappingContext.overlay) {
    const baseOpacity = 0.12 + themeState.grain * 0.7;
    mappingContext.overlay.style.opacity = `${Math.min(1, baseOpacity)}`;
  }
  if (mappingContext.canvasEngine?.canvas) {
    mappingContext.canvasEngine.canvas.style.filter = `blur(${themeState.blur.toFixed(2)}px)`;
  }
}
