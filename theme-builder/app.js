import { CanvasEngine } from './js/canvasEngine.js';
import { LayerManager, defaultFilters, defaultTransforms } from './js/layerManager.js';
import { loadAssets } from './js/assetScanner.js';
import { buildFiltersUI } from './js/filters.js';
import { buildTransformUI } from './js/transforms.js';
import { renderBehaviorBadges } from './js/behaviors.js';
import { renderSnapControls } from './js/snapEngine.js';
import { renderComponents } from './js/componentFactory.js';
import { renderInspector } from './js/inspector.js';
import { exportCSS, exportHTML, exportJSON, exportPNG, exportWordPress } from './js/exportTools.js';
import { renderSpacingPreview } from './js/spacingBlocks.js';
import { applyBucketToLayer, colorToRGBA, renderColorBuckets, resolveBucketDrag } from './js/colorBuckets.js';
import { renderTypeBlocks } from './js/typeBlocks.js';
import { loadLidarMetadata, getShotList } from './js/lidarEngine.js';
import { createDepthLayersForShot } from './js/depthLayers.js';
import { attachParallaxToShot } from './js/parallaxDepth.js';
import { applyDepthShading, applyDepthOfField, applyDepthEmboss, applyDepthColorRamp } from './js/depthEffects.js';
import {
  createHeroCardFromShot,
  addScribblesBehindSubject,
  autoScaffoldFromDepthEdges,
  groupLayersByDepth,
  applySubjectSpotlight,
} from './js/depthLayoutTools.js';

const canvas = document.getElementById('design-canvas');
const glCanvas = document.getElementById('gl-canvas');
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
const pdRoom = document.getElementById('pure-data-room');
const pdChip = document.querySelector('[data-role="pd-chip"]');

const layerManager = new LayerManager();
const canvasEngine = new CanvasEngine(canvas, overlay, layerManager);

async function init() {
  window.layerManager = layerManager;
  window.canvasEngine = canvasEngine;
  await buildAssets();
  buildBehaviors();
  buildComponents();
  buildSpacing();
  buildColorBuckets();
  buildTypeBlocks();
  await buildLidarTools();
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
  triggerThemeEvent('asset_drop', 1);
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
  layerManager.layers.forEach((layer, index) => {
    const row = document.createElement('div');
    row.className = `layer-row ${layer.id === layerManager.activeId ? 'active' : ''}`;
    row.addEventListener('click', () => layerManager.setActive(layer.id));
    const backgroundTint = colorToRGBA(layer.backgroundColor || '#0b2144', 0.18);
    row.style.background = `linear-gradient(135deg, ${backgroundTint}, rgba(255,255,255,0.04))`;
    row.style.borderColor = layer.borderColor || '#123055';

    row.addEventListener('dragover', (e) => {
      if (e.dataTransfer?.types?.includes('application/pfp-color')) {
        e.preventDefault();
        row.classList.add('dropping');
      }
    });
    row.addEventListener('dragleave', () => row.classList.remove('dropping'));
    row.addEventListener('drop', (e) => {
      const bucket = resolveBucketDrag(e);
      row.classList.remove('dropping');
      if (!bucket) return;
      e.preventDefault();
      const applied = applyBucketToLayer(layerManager, layer.id, bucket);
      if (applied) {
        canvasEngine.dirty = true;
        saveAutosave();
      }
    });
    const thumb = document.createElement('div');
    thumb.className = 'layer-thumb';
    thumb.style.background = layer.backgroundColor || '#ffce00';
    thumb.style.borderColor = layer.borderColor || '#123055';
    thumb.style.color = layer.textColor || '#0f172a';
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
  renderColorBuckets(colorBuckets, layerManager, {
    onSelect: (bucket) => {
      const glow = colorToRGBA(bucket.value, 0.16);
      document.body.style.background = `radial-gradient(circle at 20% 20%, ${glow}, transparent 40%), #061225`;
    },
  });
}

function buildTypeBlocks() {
  renderTypeBlocks(typeBlocks);
}

async function buildLidarTools() {
  const assetsColumn = document.querySelector('.assets-column');
  if (!assetsColumn) return;
  const section = document.createElement('div');
  section.className = 'section';
  const title = document.createElement('h3');
  title.textContent = 'LiDAR Depth Lab';
  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = 'Drop LiDAR shots into /assets/lidar-shots and run lidar-generate-assets.js to populate depth metadata locally.';

  const select = document.createElement('select');
  select.id = 'lidar-shot-select';
  select.style.width = '100%';
  select.style.marginBottom = '6px';

  const status = document.createElement('div');
  status.className = 'hint';

  const refreshShots = async () => {
    await loadLidarMetadata();
    const shots = await getShotList();
    select.innerHTML = '';
    if (!shots.length) {
      const option = document.createElement('option');
      option.textContent = 'No LiDAR shots found';
      option.disabled = true;
      select.appendChild(option);
      status.textContent = 'Awaiting local LiDAR assets...';
      return;
    }
    shots.forEach((shot) => {
      const option = document.createElement('option');
      option.value = shot.id;
      option.textContent = `${shot.id} (${shot.width}×${shot.height})`;
      select.appendChild(option);
    });
    status.textContent = `${shots.length} LiDAR capture(s) ready.`;
  };

  const toolbar = document.createElement('div');
  toolbar.className = 'asset-toolbar';

  const actionButton = (label, handler, primary = false) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    if (primary) btn.classList.add('primary');
    btn.addEventListener('click', async () => {
      const shotId = select.value;
      if (!shotId) {
        alert('Scan LiDAR shots first.');
        return;
      }
      await handler(shotId);
      canvasEngine.dirty = true;
    });
    return btn;
  };

  toolbar.append(
    actionButton('Import LiDAR Shot', refreshShots, true),
    actionButton('Make Depth Stack', (shotId) => createDepthLayersForShot(shotId, { layerManager })),
    actionButton('Add Parallax', (shotId) => attachParallaxToShot(shotId, canvas, { layerManager })),
  );

  const fxRow = document.createElement('div');
  fxRow.className = 'asset-toolbar';
  fxRow.append(
    actionButton('Hero Card from Depth', (shotId) => createHeroCardFromShot(shotId, { layerManager })),
    actionButton('Highlight Subject', (shotId) => applySubjectSpotlight(shotId, { layerManager })),
    actionButton('Scribbles Behind Subject', (shotId) => addScribblesBehindSubject(shotId, { layerManager })),
  );

  const shadingRow = document.createElement('div');
  shadingRow.className = 'asset-toolbar';
  shadingRow.append(
    actionButton('Depth Shading', (shotId) => applyDepthShading(shotId, { layerManager, intensity: 18 })),
    actionButton('Depth Blur', (shotId) => applyDepthOfField(shotId, { layerManager, strength: 22 })),
    actionButton('Depth Emboss', (shotId) => applyDepthEmboss(shotId, { layerManager })),
    actionButton('Depth Color Ramp', (shotId) => applyDepthColorRamp(shotId, { layerManager })),
  );

  const scaffoldingRow = document.createElement('div');
  scaffoldingRow.className = 'asset-toolbar';
  scaffoldingRow.append(
    actionButton('Auto Scaffold', (shotId) => autoScaffoldFromDepthEdges(shotId, { layerManager })),
    actionButton('Depth Stack Sort', (shotId) => groupLayersByDepth(shotId, { layerManager })),
  );

  section.append(title, hint, select, status, toolbar, fxRow, shadingRow, scaffoldingRow);
  assetsColumn.appendChild(section);

  injectToolbeltActions(select, refreshShots);
  await refreshShots();
}

function injectToolbeltActions(select, refreshShots) {
  const belt = document.querySelector('.toolbelt-actions');
  if (!belt || belt.querySelector('.lidar-chip')) return;
  const wrap = document.createElement('div');
  wrap.className = 'lidar-chip';
  wrap.style.display = 'flex';
  wrap.style.gap = '6px';
  wrap.style.flexWrap = 'wrap';
  const button = (label, handler) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.addEventListener('click', async () => {
      if (label === 'Import LiDAR Shot') {
        await refreshShots();
        return;
      }
      const shotId = select.value;
      if (!shotId) {
        alert('Choose a LiDAR capture first.');
        return;
      }
      await handler(shotId);
      canvasEngine.dirty = true;
    });
    return btn;
  };
  wrap.append(
    button('Import LiDAR Shot', () => {}),
    button('Make Depth Stack', (shotId) => createDepthLayersForShot(shotId, { layerManager })),
    button('Add Parallax', (shotId) => attachParallaxToShot(shotId, canvas, { layerManager })),
    button('Hero Card from Depth', (shotId) => createHeroCardFromShot(shotId, { layerManager })),
    button('Highlight Subject', (shotId) => applySubjectSpotlight(shotId, { layerManager })),
    button('Scribbles Behind Subject', (shotId) => addScribblesBehindSubject(shotId, { layerManager })),
  );
  belt.appendChild(wrap);
}

function bindToolbar() {
  document.querySelector('[data-action="new"]').addEventListener('click', () => {
    if (confirm('Start a new project? Current work will be replaced.')) {
      layerManager.load({ layers: [], activeId: null });
      loadMappingsFromJSON({ mappings: [] });
      triggerThemeEvent('toolbar_click', 1);
      saveAutosave();
    }
  });

  document.querySelector('[data-action="save"]').addEventListener('click', () => {
    const data = JSON.stringify(collectProjectState(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'project.json';
    link.click();
    triggerThemeEvent('toolbar_click', 0.2);
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
        if (parsed.project || parsed.pureData) {
          layerManager.load(parsed.project || { layers: [], activeId: null });
          loadMappingsFromJSON(parsed.pureData);
        } else {
          layerManager.load(parsed);
        }
        triggerThemeEvent('toolbar_click', 0.5);
        saveAutosave();
      };
      reader.readAsText(file);
    });
    input.click();
  });

  const canvasState = () => layerManager.serialize();
  document.querySelector('[data-action="export-html"]').addEventListener('click', () => exportHTML(canvasState()));
  document.querySelector('[data-action="export-png"]').addEventListener('click', () => exportPNG(canvas));
  document.querySelector('[data-action="export-json"]').addEventListener('click', () => exportJSON(canvasState()));

  const cssButton = document.querySelector('[data-action="export-css"]');
  if (cssButton) cssButton.addEventListener('click', () => exportCSS(canvasState().theme));

  const wpButton = document.querySelector('[data-action="export-wordpress"]');
  if (wpButton) wpButton.addEventListener('click', () => exportWordPress(canvasState()));
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
  const snapshot = JSON.stringify(collectProjectState());
  localStorage.setItem('construction-builder', snapshot);
  const history = JSON.parse(localStorage.getItem('construction-history') || '[]');
  history.unshift({ ts: Date.now(), data: snapshot });
  localStorage.setItem('construction-history', JSON.stringify(history.slice(0, 20)));
}

function loadAutosave() {
  const data = localStorage.getItem('construction-builder');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.project || parsed.pureData) {
        layerManager.load(parsed.project || { layers: [], activeId: null });
        loadMappingsFromJSON(parsed.pureData);
      } else {
        layerManager.load(parsed);
      }
    } catch (error) {
      console.warn('Unable to load autosave', error);
    }
  }
  autosave();
}

function collectProjectState() {
  return { project: layerManager.serialize(), pureData: serializeMappings() };
}

init();
