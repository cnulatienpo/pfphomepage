import { CanvasEngine } from './js/canvasEngine.js';
import { LayerManager, defaultFilters, defaultTransforms } from './js/layerManager.js';
import { loadAssets } from './js/assetScanner.js';
import { buildFiltersUI } from './js/filters.js';
import { buildTransformUI } from './js/transforms.js';
import { renderBehaviorBadges } from './js/behaviors.js';
import { renderSnapControls } from './js/snapEngine.js';
import { renderComponents } from './js/componentFactory.js';
import { renderInspector } from './js/inspector.js';
import { exportToHTML, exportToJSON, exportToPNG } from './js/exportTools.js';
import { renderSpacingPreview } from './js/spacingBlocks.js';
import { renderColorBuckets } from './js/colorBuckets.js';
import { renderTypeBlocks } from './js/typeBlocks.js';

const canvas = document.getElementById('design-canvas');
const overlay = document.getElementById('canvas-overlay');
const layerPanel = document.getElementById('layer-panel');
const filterControls = document.getElementById('filter-controls');
const transformControls = document.getElementById('transform-controls');
const properties = document.getElementById('properties');
const themeComponents = document.getElementById('theme-components');
const assetList = document.getElementById('asset-list');
const badgeGrid = document.getElementById('behavior-badges');
const spacingPreview = document.getElementById('spacing-preview');
const colorBuckets = document.getElementById('color-buckets');
const typeBlocks = document.getElementById('type-blocks');

const layerManager = new LayerManager();
const canvasEngine = new CanvasEngine(canvas, overlay, layerManager);

async function init() {
  await buildAssets();
  buildBehaviors();
  buildComponents();
  buildSpacing();
  buildColorBuckets();
  buildTypeBlocks();
  bindToolbar();
  layerManager.subscribe(renderLayers);
  layerManager.subscribe(() => renderInspector(properties, layerManager));
  layerManager.subscribe(() => buildFiltersUI(filterControls, layerManager, () => (canvasEngine.dirty = true)));
  layerManager.subscribe(() => buildTransformUI(transformControls, layerManager, () => (canvasEngine.dirty = true)));
  layerManager.subscribe(() => (canvasEngine.dirty = true));
  renderSnapControls(document.getElementById('peg-visibility'), canvasEngine);
  loadAutosave();
}

async function buildAssets() {
  const assets = await loadAssets();
  assetList.innerHTML = '';
  assets.forEach((asset) => {
    const card = document.createElement('div');
    card.className = 'asset-card';
    card.draggable = true;
    card.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', JSON.stringify(asset)));
    card.addEventListener('dblclick', () => addAssetToCanvas(asset));
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.style.backgroundImage = `url(${asset.src})`;
    thumb.style.backgroundSize = 'cover';
    thumb.textContent = asset.name.split(' ').map((w) => w[0]).join('');
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = asset.name;
    card.append(thumb, name);
    assetList.appendChild(card);
  });

  canvas.addEventListener('dragover', (e) => e.preventDefault());
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    try {
      const payload = JSON.parse(data);
      if (payload.type === 'component') {
        addComponentToCanvas(payload, e.offsetX / canvasEngine.zoom, e.offsetY / canvasEngine.zoom);
      } else {
        addAssetToCanvas(payload, e.offsetX / canvasEngine.zoom, e.offsetY / canvasEngine.zoom);
      }
    } catch (_) {
      /* ignore */
    }
  });
}

function addAssetToCanvas(asset, x = 200, y = 200) {
  layerManager.createLayer({
    name: asset.name,
    src: asset.src,
    x,
    y,
    width: 260,
    height: 220,
    filter: defaultFilters(),
    transform: defaultTransforms(),
    placeholder: true,
  });
  saveAutosave();
}

function addComponentToCanvas(component, x = 220, y = 220) {
  layerManager.createLayer({
    name: component.name,
    src: component.src || '',
    x,
    y,
    width: component.width || 320,
    height: component.height || 220,
    filter: defaultFilters(),
    transform: defaultTransforms(),
    placeholder: true,
    classes: component.classes || [],
    markup: component.markup || `<div class="construction-component ${
      component.classes?.join(' ') || ''
    }"></div>`,
  });
  saveAutosave();
}

function renderLayers() {
  layerPanel.innerHTML = '';
  layerManager.layers.forEach((layer) => {
    const row = document.createElement('div');
    row.className = `layer-row ${layer.id === layerManager.activeId ? 'active' : ''}`;
    row.addEventListener('click', () => layerManager.setActive(layer.id));
    const thumb = document.createElement('div');
    thumb.className = 'layer-thumb';
    thumb.textContent = layer.name.slice(0, 2).toUpperCase();
    const meta = document.createElement('div');
    meta.className = 'layer-meta';
    const title = document.createElement('div');
    title.className = 'name';
    title.textContent = layer.name;
    const subtitle = document.createElement('div');
    subtitle.className = 'meta';
    subtitle.textContent = `${Math.round(layer.width)}x${Math.round(layer.height)} · ${layer.blendMode}`;
    meta.append(title, subtitle);
    const actions = document.createElement('div');
    actions.className = 'layer-actions';
    actions.append(
      iconButton('👁', () => layerManager.toggleVisibility(layer.id)),
      iconButton('🔒', () => layerManager.toggleLock(layer.id)),
      iconButton('⬆️', (e) => { e.stopPropagation(); layerManager.moveLayer(layer.id, -1); }),
      iconButton('⬇️', (e) => { e.stopPropagation(); layerManager.moveLayer(layer.id, 1); }),
      iconButton('🗑', (e) => { e.stopPropagation(); layerManager.removeLayer(layer.id); }),
    );
    row.append(thumb, meta, actions);
    layerPanel.appendChild(row);
  });
}

function iconButton(label, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(e); saveAutosave(); });
  return btn;
}

function buildBehaviors() {
  renderBehaviorBadges(badgeGrid, (badge) => {
    const active = layerManager.layers.find((l) => l.id === layerManager.activeId);
    if (!active) return;
    layerManager.updateLayer(active.id, { sticker: badge.id });
    saveAutosave();
  });
}

function buildComponents() {
  renderComponents(themeComponents, (componentLayer) => {
    addComponentToCanvas(componentLayer, 240, 240);
    canvasEngine.dirty = true;
  });
}

function buildSpacing() {
  renderSpacingPreview(spacingPreview);
}

function buildColorBuckets() {
  renderColorBuckets(colorBuckets, (bucket) => {
    document.body.style.background = `radial-gradient(circle at 20% 20%, ${bucket.value}22, transparent 40%), #061225`;
  });
}

function buildTypeBlocks() {
  renderTypeBlocks(typeBlocks);
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

  document.getElementById('scan-assets').addEventListener('click', () => buildAssets());
  document.getElementById('refresh-placeholders').addEventListener('click', () => buildAssets());
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
