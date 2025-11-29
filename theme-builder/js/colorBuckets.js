const DEFAULT_BUCKETS = [
  { name: '--fp-yellow', label: 'Safety Yellow', value: '#ffce00' },
  { name: '--fp-red', label: 'Playful Red', value: '#ff5757' },
  { name: '--fp-blue', label: 'Builder Blue', value: '#2b7de9' },
  { name: '--fp-green', label: 'Grass Green', value: '#4ade80' },
  { name: '--fp-ink', label: 'Night Navy', value: '#0f172a' },
  { name: '--fp-panel', label: 'Panel Blue', value: '#0b1b33' },
];

const COLOR_DRAG_TYPE = 'application/pfp-color';
export const colorHistory = [];

function isColorValue(value) {
  const normalized = value.trim().toLowerCase();
  return /^(#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8}))$/.test(normalized) ||
    /^rgb(a)?\(/.test(normalized) ||
    /^hsl(a)?\(/.test(normalized);
}

function normalizeLabel(name) {
  return name.replace(/^--/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getThemeTokens() {
  const computed = getComputedStyle(document.documentElement);
  const tokens = [];
  for (let i = 0; i < computed.length; i += 1) {
    const name = computed[i];
    if (!name.startsWith('--')) continue;
    const value = computed.getPropertyValue(name).trim();
    if (isColorValue(value)) {
      tokens.push({ name, label: normalizeLabel(name), value });
    }
  }
  if (tokens.length === 0) return DEFAULT_BUCKETS;
  const deduped = new Map();
  tokens.forEach((token) => {
    const key = `${token.name}-${token.value.toLowerCase()}`;
    if (!deduped.has(key)) deduped.set(key, token);
  });
  return Array.from(deduped.values());
}

function clamp(value, min = 0, max = 255) {
  const rounded = Math.round(value);
  return Math.min(max, Math.max(min, rounded));
}

function parseColorToRGB(color) {
  const scratch = document.createElement('span');
  scratch.style.color = color;
  scratch.style.display = 'none';
  document.body.appendChild(scratch);
  const result = getComputedStyle(scratch).color;
  scratch.remove();
  const match = result.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return [255, 255, 255];
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

export function colorToRGBA(color, alpha = 1) {
  const [r, g, b] = parseColorToRGB(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function emphasizeColor(color, delta = -0.08) {
  const [r, g, b] = parseColorToRGB(color);
  const offset = delta * 255;
  return `rgb(${clamp(r + offset)}, ${clamp(g + offset)}, ${clamp(b + offset)})`;
}

function getContrastColor(color) {
  const [r, g, b] = parseColorToRGB(color).map((v) => v / 255);
  const [R, G, B] = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  return luminance > 0.55 ? '#0f172a' : '#f8fafc';
}

function logHistory(bucket, layerId) {
  colorHistory.unshift({
    layerId,
    name: bucket.name,
    label: bucket.label,
    value: bucket.value,
    appliedAt: Date.now(),
  });
  if (colorHistory.length > 50) colorHistory.pop();
}

export function applyBucketToLayer(layerManager, layerId, bucket) {
  if (!layerId || !bucket) return false;
  const target = layerManager.layers.find((layer) => layer.id === layerId);
  if (!target) return false;
  const backgroundColor = bucket.value;
  const borderColor = emphasizeColor(bucket.value, -0.16);
  const textColor = getContrastColor(bucket.value);
  layerManager.updateLayer(layerId, { backgroundColor, borderColor, textColor });
  logHistory(bucket, layerId);
  return true;
}

export function renderColorBuckets(container, layerManager, options = {}) {
  const palette = getThemeTokens();
  container.innerHTML = '';

  palette.forEach((bucket) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'color-chip';
    chip.draggable = true;
    chip.dataset.colorName = bucket.name;
    chip.dataset.colorValue = bucket.value;

    const swatch = document.createElement('span');
    swatch.className = 'color-chip__swatch';
    swatch.style.setProperty('--bucket-color', bucket.value);

    const label = document.createElement('span');
    label.className = 'color-chip__label';
    label.textContent = bucket.label;

    chip.addEventListener('click', () => {
      const didApply = applyBucketToLayer(layerManager, layerManager.activeId, bucket);
      if (!didApply) {
        logHistory(bucket, 'unassigned');
      }
      options.onSelect?.(bucket);
    });

    chip.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData(COLOR_DRAG_TYPE, JSON.stringify(bucket));
    });

    chip.append(swatch, label);
    container.appendChild(chip);
  });
}

export function resolveBucketDrag(event) {
  const payload = event.dataTransfer?.getData(COLOR_DRAG_TYPE);
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch (error) {
    console.warn('Invalid color bucket payload', error);
    return null;
  }
}
