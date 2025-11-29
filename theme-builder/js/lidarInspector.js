import { sampleDepthAt, loadShot } from './lidarEngine.js';

const registry = new Map();

export function registerLidarLayer(layerId, shotId, depthSettings = {}) {
  registry.set(layerId, { shotId, depthSettings });
}

export async function updateInspectorForLayer(layerId, container, layerManager) {
  const entry = registry.get(layerId);
  if (!entry) return;
  const { shotId, depthSettings } = entry;
  const shot = await loadShot(shotId).catch(() => null);
  if (!shot) return;

  const panel = document.createElement('div');
  panel.className = 'lidar-depth-panel';

  const header = document.createElement('div');
  header.className = 'lidar-depth-header';
  header.textContent = `LiDAR Depth · ${shotId}`;
  panel.appendChild(header);

  const preview = document.createElement('canvas');
  preview.width = 160;
  preview.height = 90;
  if (shot.depthMap) {
    const ctx = preview.getContext('2d');
    ctx.drawImage(shot.depthMap, 0, 0, preview.width, preview.height);
  }
  const previewWrap = document.createElement('div');
  previewWrap.className = 'lidar-preview';
  previewWrap.appendChild(preview);
  panel.appendChild(previewWrap);

  const range = document.createElement('div');
  range.className = 'lidar-range';
  range.textContent = `Depth: ${shot.meta.depthRange?.[0]}m → ${shot.meta.depthRange?.[1]}m`;
  panel.appendChild(range);

  const toggles = document.createElement('div');
  toggles.className = 'lidar-toggle-grid';
  ['Use as foreground mask', 'Use as background texture', 'Use for depth-of-field', 'Use for depth shading'].forEach((label) => {
    const row = document.createElement('label');
    row.className = 'lidar-toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(depthSettings[label]);
    checkbox.addEventListener('change', () => {
      registry.set(layerId, { shotId, depthSettings: { ...depthSettings, [label]: checkbox.checked } });
    });
    row.append(checkbox, document.createTextNode(label));
    toggles.appendChild(row);
  });
  panel.appendChild(toggles);

  const histogram = document.createElement('canvas');
  histogram.width = 200;
  histogram.height = 80;
  renderHistogram(histogram, shot.depthInfo?.data?.data);
  panel.appendChild(histogram);

  container.appendChild(panel);
}

function renderHistogram(canvas, data) {
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  const buckets = new Array(20).fill(0);
  for (let i = 0; i < data.length; i += 4 * Math.max(1, Math.floor(data.length / 8000))) {
    const depth = data[i];
    const bucketIndex = Math.min(buckets.length - 1, Math.floor((depth / 255) * buckets.length));
    buckets[bucketIndex] += 1;
  }
  const max = Math.max(...buckets, 1);
  ctx.fillStyle = '#0b1b33';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  buckets.forEach((value, idx) => {
    const h = (value / max) * canvas.height;
    const x = (idx / buckets.length) * canvas.width;
    ctx.fillStyle = idx < 5 ? '#fbbf24' : idx > 12 ? '#38bdf8' : '#a78bfa';
    ctx.fillRect(x, canvas.height - h, canvas.width / buckets.length - 2, h);
  });
}

export function registerDepthSampleHover(canvas, shotId) {
  if (!canvas) return;
  canvas.addEventListener('mousemove', (evt) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((evt.clientY - rect.top) / rect.height) * canvas.height;
    const sample = sampleDepthAt(shotId, x, y);
    if (!sample) return;
    canvas.title = `Depth ${sample.depthMeters.toFixed(2)}m`;
  });
}
