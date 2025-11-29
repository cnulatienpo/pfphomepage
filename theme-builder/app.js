import { CanvasEngine } from './js/canvasEngine.js';
import { LayerManager, defaultFilters, defaultTransforms } from './js/layerManager.js';
import { exportToHTML, exportToJSON, exportToPNG } from './js/exportTools.js';
import { renderComponentButtons } from './js/themeIntegration.js';

const canvas = document.getElementById('design-canvas');
const overlay = document.getElementById('canvas-overlay');
const layerPanel = document.getElementById('layer-panel');
const filterControls = document.getElementById('filter-controls');
const transformControls = document.getElementById('transform-controls');
const properties = document.getElementById('properties');
const themeComponents = document.getElementById('theme-components');
const assetList = document.getElementById('asset-list');

const layerManager = new LayerManager();
const canvasEngine = new CanvasEngine(canvas, overlay, layerManager);

const assetSources = [
  { name: 'Construction Grid', src: 'assets/placeholder-grid.svg' },
  { name: 'Marker Stroke', src: 'assets/placeholder-mark.svg' },
  { name: 'Concrete Texture', src: 'assets/placeholder-texture.svg' },
];

function init() {
  buildAssets();
  buildFilters();
  buildTransforms();
  buildThemeComponents();
  bindToolbar();
  layerManager.subscribe(renderLayers);
  layerManager.subscribe(renderProperties);
  layerManager.subscribe(() => (canvasEngine.dirty = true));
  loadAutosave();
}

function buildAssets() {
  assetList.innerHTML = '';
  assetSources.forEach((asset) => {
    const card = document.createElement('div');
    card.className = 'asset-card';
    card.draggable = true;
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify(asset));
    });
    card.addEventListener('dblclick', () => addAssetToCanvas(asset));
    const img = document.createElement('img');
    img.src = asset.src;
    img.alt = asset.name;
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = asset.name;
    card.appendChild(img);
    card.appendChild(name);
    assetList.appendChild(card);
  });

  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      addAssetToCanvas(data, e.offsetX / canvasEngine.zoom, e.offsetY / canvasEngine.zoom);
    } catch (_) {
      /* ignored */
    }
  });
}

function addAssetToCanvas(asset, x = 160, y = 120) {
  layerManager.createLayer({
    name: asset.name,
    src: asset.src,
    x,
    y,
    width: 260,
    height: 260,
    filter: defaultFilters(),
    transform: defaultTransforms(),
  });
}

function renderLayers() {
  layerPanel.innerHTML = '';
  const list = document.createElement('ul');
  list.className = 'layer-list';
  layerManager.layers.forEach((layer) => {
    const item = document.createElement('li');
    item.className = `layer-item ${layer.id === layerManager.activeId ? 'active' : ''}`;
    item.addEventListener('click', () => layerManager.setActive(layer.id));

    const controls = document.createElement('div');
    controls.className = 'layer-controls';

    const eye = document.createElement('button');
    eye.textContent = layer.visible ? '👁' : '🚫';
    eye.title = 'Toggle visibility';
    eye.addEventListener('click', (e) => {
      e.stopPropagation();
      layerManager.toggleVisibility(layer.id);
    });

    const lock = document.createElement('button');
    lock.textContent = layer.locked ? '🔒' : '🔓';
    lock.title = 'Toggle lock';
    lock.addEventListener('click', (e) => {
      e.stopPropagation();
      layerManager.toggleLock(layer.id);
    });

    const up = document.createElement('button');
    up.textContent = '▲';
    up.addEventListener('click', (e) => {
      e.stopPropagation();
      layerManager.moveLayer(layer.id, -1);
    });

    const down = document.createElement('button');
    down.textContent = '▼';
    down.addEventListener('click', (e) => {
      e.stopPropagation();
      layerManager.moveLayer(layer.id, 1);
    });

    const del = document.createElement('button');
    del.textContent = '🗑';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      layerManager.removeLayer(layer.id);
    });

    controls.append(eye, lock, up, down, del);

    const title = document.createElement('div');
    title.className = 'layer-name';
    title.textContent = layer.name;

    const opacity = document.createElement('input');
    opacity.type = 'range';
    opacity.min = 0;
    opacity.max = 1;
    opacity.step = 0.01;
    opacity.className = 'layer-opacity';
    opacity.value = layer.opacity;
    opacity.addEventListener('input', (e) => layerManager.updateLayer(layer.id, { opacity: Number(e.target.value) }));

    item.append(controls, title, opacity);
    list.appendChild(item);
  });
  layerPanel.appendChild(list);
}

function buildFilters() {
  const fields = [
    { key: 'brightness', min: 0, max: 200 },
    { key: 'contrast', min: 0, max: 200 },
    { key: 'saturation', min: 0, max: 200 },
    { key: 'hue', min: -180, max: 180 },
    { key: 'blur', min: 0, max: 20 },
    { key: 'sharpen', min: 0, max: 20 },
    { key: 'invert', min: 0, max: 100 },
    { key: 'grayscale', min: 0, max: 100 },
    { key: 'sepia', min: 0, max: 100 },
    { key: 'vignette', min: 0, max: 100 },
    { key: 'depth', min: 0, max: 40 },
    { key: 'texture', min: 0, max: 100 },
    { key: 'inkWeight', min: 0, max: 100 },
    { key: 'scratchiness', min: 0, max: 100 },
    { key: 'shadow', min: 0, max: 60 },
    { key: 'glow', min: 0, max: 60 },
    { key: 'noise', min: 0, max: 100 },
  ];
  filterControls.innerHTML = '';
  fields.forEach((field) => {
    const wrapper = document.createElement('label');
    wrapper.textContent = field.key;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = field.min;
    input.max = field.max;
    input.value = field.key === 'brightness' || field.key === 'contrast' || field.key === 'saturation' ? 100 : 0;
    input.addEventListener('input', () => {
      const layer = layerManager.activeLayer;
      if (!layer) return;
      layer.filter[field.key] = Number(input.value);
      layerManager.updateLayer(layer.id, { filter: { ...layer.filter } });
    });
    wrapper.appendChild(input);
    filterControls.appendChild(wrapper);
  });
}

function buildTransforms() {
  const fields = [
    { key: 'scaleX', min: -3, max: 3, step: 0.01, value: 1 },
    { key: 'scaleY', min: -3, max: 3, step: 0.01, value: 1 },
    { key: 'rotation', min: -180, max: 180, step: 1, value: 0 },
    { key: 'skewX', min: -45, max: 45, step: 1, value: 0 },
    { key: 'skewY', min: -45, max: 45, step: 1, value: 0 },
  ];
  transformControls.innerHTML = '';
  fields.forEach((field) => {
    const wrapper = document.createElement('label');
    wrapper.textContent = field.key;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = field.min;
    input.max = field.max;
    input.step = field.step;
    input.value = field.value;
    input.addEventListener('input', () => {
      const layer = layerManager.activeLayer;
      if (!layer) return;
      layer.transform[field.key] = Number(input.value);
      layerManager.updateLayer(layer.id, { transform: { ...layer.transform } });
    });
    wrapper.appendChild(input);
    transformControls.appendChild(wrapper);
  });

  const flipX = document.createElement('button');
  flipX.textContent = 'Flip X';
  flipX.addEventListener('click', () => toggleFlip('flipX'));
  const flipY = document.createElement('button');
  flipY.textContent = 'Flip Y';
  flipY.addEventListener('click', () => toggleFlip('flipY'));
  transformControls.append(flipX, flipY);
}

function toggleFlip(key) {
  const layer = layerManager.activeLayer;
  if (!layer) return;
  layer.transform[key] = !layer.transform[key];
  layerManager.updateLayer(layer.id, { transform: { ...layer.transform } });
}

function buildThemeComponents() {
  renderComponentButtons(themeComponents, (component) => {
    layerManager.createLayer({
      name: component.name,
      type: 'component',
      classes: component.classes,
      width: 320,
      height: 180,
      x: 100,
      y: 100,
    });
  });
}

function renderProperties() {
  properties.innerHTML = '';
  const layer = layerManager.activeLayer;
  if (!layer) {
    properties.textContent = 'Select a layer to edit properties.';
    return;
  }
  const nameField = buildTextField('Name', layer.name, (value) => layerManager.updateLayer(layer.id, { name: value }));
  const blendField = buildSelect('Blend mode', layer.blendMode, ['source-over', 'multiply', 'screen', 'overlay', 'soft-light'], (value) => layerManager.updateLayer(layer.id, { blendMode: value }));
  const widthField = buildNumber('Width', layer.width, (value) => layerManager.updateLayer(layer.id, { width: value }));
  const heightField = buildNumber('Height', layer.height, (value) => layerManager.updateLayer(layer.id, { height: value }));
  properties.append(nameField, blendField, widthField, heightField);
}

function buildTextField(label, value, onChange) {
  const field = document.createElement('div');
  field.className = 'property-field';
  const span = document.createElement('span');
  span.textContent = label;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.addEventListener('input', (e) => onChange(e.target.value));
  field.append(span, input);
  return field;
}

function buildNumber(label, value, onChange) {
  const field = document.createElement('div');
  field.className = 'property-field';
  const span = document.createElement('span');
  span.textContent = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.value = value;
  input.addEventListener('input', (e) => onChange(Number(e.target.value)));
  field.append(span, input);
  return field;
}

function buildSelect(label, value, options, onChange) {
  const field = document.createElement('div');
  field.className = 'property-field';
  const span = document.createElement('span');
  span.textContent = label;
  const select = document.createElement('select');
  options.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    if (opt === value) option.selected = true;
    select.appendChild(option);
  });
  select.addEventListener('change', (e) => onChange(e.target.value));
  field.append(span, select);
  return field;
}

function bindToolbar() {
  document.querySelector('[data-action="new"]').addEventListener('click', () => {
    if (confirm('Start a new project? Current work will be replaced.')) {
      layerManager.load({ layers: [], activeId: null });
      saveAutosave();
    }
  });

  document.querySelector('[data-action="save"]').addEventListener('click', () => {
    const data = JSON.stringify(layerManager.serialize(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'project.json';
    link.click();
  });

  document.querySelector('[data-action="open"]').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const parsed = JSON.parse(evt.target.result);
        layerManager.load(parsed);
        saveAutosave();
      };
      reader.readAsText(file);
    });
    input.click();
  });

  document.querySelector('[data-action="export-html"]').addEventListener('click', () => exportToHTML(layerManager));
  document.querySelector('[data-action="export-png"]').addEventListener('click', () => exportToPNG(canvas));
  document.querySelector('[data-action="export-json"]').addEventListener('click', () => exportToJSON(layerManager));
  document.querySelector('[data-action="toggle-grid"]').addEventListener('click', () => canvasEngine.toggleGrid());
  document.querySelector('[data-action="zoom-in"]').addEventListener('click', () => canvasEngine.setZoom(0.1));
  document.querySelector('[data-action="zoom-out"]').addEventListener('click', () => canvasEngine.setZoom(-0.1));
}

function autosave() {
  saveAutosave();
  setTimeout(autosave, 8000);
}

function saveAutosave() {
  const snapshot = JSON.stringify(layerManager.serialize());
  localStorage.setItem('construction-builder', snapshot);
  const history = JSON.parse(localStorage.getItem('construction-history') || '[]');
  history.unshift({ ts: Date.now(), data: snapshot });
  localStorage.setItem('construction-history', JSON.stringify(history.slice(0, 20)));
}

function loadAutosave() {
  const data = localStorage.getItem('construction-builder');
  if (data) {
    try {
      layerManager.load(JSON.parse(data));
    } catch (error) {
      console.warn('Unable to load autosave', error);
    }
  }
  autosave();
}

init();
