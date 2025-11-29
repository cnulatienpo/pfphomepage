import { listMotionPresets, applyPreset } from './motionPresets.js';

const motionRegistry = {};

function buildPresetCard(preset, layerManager, container, onAnimate) {
  const card = document.createElement('div');
  card.className = 'motion-card';
  const title = document.createElement('div');
  title.className = 'motion-title';
  title.textContent = preset.name;
  const desc = document.createElement('div');
  desc.className = 'motion-desc';
  desc.textContent = preset.description;
  const controls = document.createElement('div');
  controls.className = 'motion-actions';
  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Apply';
  applyBtn.addEventListener('click', () => {
    const layer = layerManager.layers.find((l) => l.id === layerManager.activeId);
    if (!layer) return;
    motionRegistry[layer.id] = { presetId: preset.id, options: { duration: 700, onUpdate: () => onAnimate?.() } };
    applyPreset(preset.id, layer, motionRegistry[layer.id].options);
  });
  const preview = document.createElement('div');
  preview.className = 'motion-preview';
  preview.innerHTML = '<div class="dot"></div>';
  preview.addEventListener('mouseenter', () => applyPreset(preset.id, preview.querySelector('.dot'), { duration: 800 }));
  controls.append(applyBtn, preview);
  card.append(title, desc, controls);
  container.appendChild(card);
}

function buildMotionUI(container, layerManager, onAnimate) {
  container.innerHTML = '';
  const presets = listMotionPresets();
  presets.forEach((preset) => buildPresetCard(preset, layerManager, container, onAnimate));
  const toolbar = document.createElement('div');
  toolbar.className = 'motion-toolbar';
  const playAll = document.createElement('button');
  playAll.textContent = 'Play All Motion';
  playAll.addEventListener('click', () => {
    Object.entries(motionRegistry).forEach(([layerId, config]) => {
      const layer = layerManager.layers.find((l) => l.id === layerId);
      if (layer) applyPreset(config.presetId, layer, config.options);
    });
    onAnimate?.();
  });
  toolbar.appendChild(playAll);
  container.appendChild(toolbar);
}

export { buildMotionUI, motionRegistry };
