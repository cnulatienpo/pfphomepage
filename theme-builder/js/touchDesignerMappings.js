import {
  getChannelValue,
  getChannelsSnapshot,
  sendChannelToTouchDesigner,
} from './touchDesignerEngine.js';

const mappings = new Map();
const targetHandlers = new Map();

const curveFns = {
  linear: (v) => v,
  exp: (v) => v ** 2,
  log: (v) => Math.sqrt(v),
  easeInOut: (v) => 0.5 * (1 - Math.cos(Math.PI * v)),
};

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function mapRange(value, inRange = [0, 1], outRange = [0, 1]) {
  const [inMin, inMax] = inRange;
  const [outMin, outMax] = outRange;
  if (inMax - inMin === 0) return outMin;
  const ratio = (value - inMin) / (inMax - inMin);
  return outMin + clamp01(ratio) * (outMax - outMin);
}

export function registerTargetHandler(name, handler) {
  targetHandlers.set(name, handler);
}

export function addMapping(config) {
  const id = config.id || `map-${Math.random().toString(16).slice(2, 8)}`;
  mappings.set(id, { ...config, id });
  return id;
}

export function removeMapping(mappingId) {
  mappings.delete(mappingId);
}

export function listMappings() {
  return Array.from(mappings.values());
}

export function clearMappings() {
  mappings.clear();
}

function applyMapping(mapping) {
  if (mapping.direction === 'td→theme') {
    const sourceValue = getChannelValue(mapping.source, 0);
    const normalized = clamp01(mapRange(sourceValue, mapping.inRange || [0, 1], [0, 1]));
    const curve = curveFns[mapping.curve || 'linear'] || curveFns.linear;
    let value = curve(normalized);

    if (mapping.mode === 'toggle') {
      const threshold = mapping.threshold ?? 0.5;
      value = normalized >= threshold ? (mapping.outRange?.[1] ?? 1) : mapping.outRange?.[0] ?? 0;
    } else if (mapping.mode === 'step') {
      const steps = mapping.outRange || [0, 0.5, 1];
      const index = Math.min(steps.length - 1, Math.floor(normalized * steps.length));
      value = steps[index];
    } else {
      value = mapRange(value, [0, 1], mapping.outRange || [0, 1]);
    }

    if (mapping.smoothing) {
      const last = mapping.__lastValue ?? value;
      value = last + (value - last) * clamp01(mapping.smoothing);
    }

    mapping.__lastValue = value;
    const handler = targetHandlers.get(mapping.target);
    if (handler) {
      handler(value, mapping);
    }
  }
}

export function applyTouchDesignerMappings() {
  mappings.forEach((mapping) => applyMapping(mapping));
}

export function emitThemeEvent(name, payload = 0) {
  mappings.forEach((mapping) => {
    if (mapping.direction === 'theme→td' && mapping.source === name) {
      const value = Array.isArray(payload) ? payload[0] : payload;
      const mapped = mapRange(Number(value) || 0, mapping.inRange || [0, 1], mapping.outRange || [0, 1]);
      sendChannelToTouchDesigner(mapping.target, mapped);
    }
  });
}

export function serializeMappings() {
  return listMappings().map((mapping) => {
    const clone = { ...mapping };
    delete clone.__lastValue;
    return clone;
  });
}

export function loadMappings(json = []) {
  clearMappings();
  json.forEach((mapping) => addMapping(mapping));
}

// Default target handlers to keep theme reactions playful without other modules
registerTargetHandler('theme.layout.spacing', (value) => {
  document.documentElement.style.setProperty('--td-spacing-scale', (0.8 + value * 0.4).toFixed(2));
  const canvasArea = document.querySelector('.canvas-area');
  if (canvasArea) {
    canvasArea.style.gap = `${16 * (0.8 + value * 0.4)}px`;
  }
});

registerTargetHandler('theme.colors.saturation', (value) => {
  document.documentElement.style.setProperty('--td-saturation', `${Math.round(value * 100)}%`);
});

registerTargetHandler('theme.colors.hueShift', (value) => {
  const hue = Math.round(value * 360);
  document.documentElement.style.setProperty('--td-hue-shift', `${hue}deg`);
});

registerTargetHandler('theme.motion.pulse', (value) => {
  if (value > 0.5) {
    document.body.classList.add('td-pulse');
    setTimeout(() => document.body.classList.remove('td-pulse'), 180);
  }
});

registerTargetHandler('theme.scene.index', (value) => {
  document.body.dataset.tdScene = String(Math.round(value));
});

registerTargetHandler('theme.depth.fog', (value) => {
  document.documentElement.style.setProperty('--td-depth-fog', `${(value * 60).toFixed(1)}%`);
});

export function getThemeTargets() {
  return [
    { id: 'theme.layout.spacing', label: 'Layout Spacing' },
    { id: 'theme.colors.saturation', label: 'Color Saturation' },
    { id: 'theme.colors.hueShift', label: 'Hue Shift' },
    { id: 'theme.motion.pulse', label: 'Pulse' },
    { id: 'theme.scene.index', label: 'Scene Index' },
    { id: 'theme.depth.fog', label: 'Depth Fog' },
  ];
}

export function getTouchDesignerChannelList() {
  return Object.keys(getChannelsSnapshot());
}
