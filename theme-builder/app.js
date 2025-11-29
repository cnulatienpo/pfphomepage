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
import { initGL, setPostProcessor } from './js/glEngine.js';
import { listScenes, createSceneInstance, destroySceneInstance } from './js/glScenes.js';
import { initPostFX, setPostFXSettings, postProcessor } from './js/glPostFX.js';
import { buildMotionUI, motionRegistry } from './js/motionUI.js';
import { initCreativePlayground, runUserCode } from './js/creativePlayground.js';

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
const glPanel = document.getElementById('gl-panel');
const postfxPanel = document.getElementById('postfx-panel');
const motionPanel = document.getElementById('motion-panel');
const playgroundPanel = document.getElementById('playground-panel');

const themeState = {
  mainBgColor: [0.05, 0.09, 0.18],
  accentColor: [1.0, 0.78, 0.0],
  borderColor: [0.07, 0.25, 0.42],
  spacingScale: 1,
};

let activeScene = null;
let activeSceneId = null;
let playgroundSource = '';
let postFXState = { blurAmount: 0, vignetteAmount: 0.35, chromaOffset: 0, glitchAmount: 0 };
let playgroundUI = null;

const layerManager = new LayerManager();
const canvasEngine = new CanvasEngine(canvas, overlay, layerManager);

async function init() {
  await buildAssets();
  buildBehaviors();
  buildComponents();
  buildSpacing();
  buildColorBuckets();
  buildTypeBlocks();
  await setupWebGL();
  buildGLUI();
  buildPostFXUI();
  buildMotionUI(motionPanel, layerManager, () => (canvasEngine.dirty = true));
  setupPlayground();
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
      const asset = JSON.parse(data);
      addAssetToCanvas(asset, e.offsetX / canvasEngine.zoom, e.offsetY / canvasEngine.zoom);
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
  renderComponents(themeComponents, (component) => {
    addAssetToCanvas({ name: component.name, src: '', placeholder: true }, 240, 240);
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

async function setupWebGL() {
  try {
    const gl = await initGL(glCanvas);
    initPostFX(gl);
    setPostProcessor(postProcessor);
    setPostFXSettings(postFXState);
  } catch (error) {
    console.warn('WebGL not available', error);
  }
}

function buildGLUI() {
  if (!glPanel) return;
  glPanel.innerHTML = '';
  listScenes().forEach((scene) => {
    const card = document.createElement('div');
    card.className = 'scene-card';
    const title = document.createElement('h4');
    title.textContent = scene.name;
    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = scene.description || '';
    const btn = document.createElement('button');
    btn.textContent = activeSceneId === scene.id ? 'Reload' : 'Load Scene';
    btn.addEventListener('click', () => {
      activateScene(scene.id);
      btn.textContent = 'Reload';
    });
    card.append(title, desc);
    Object.entries(scene.defaultParams || {}).forEach(([key, value]) => {
      if (typeof value !== 'number') return;
      const label = document.createElement('label');
      label.textContent = key;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = String(Math.max(value * 3, 1));
      input.step = '0.01';
      input.value = value;
      input.addEventListener('input', (e) => {
        if (activeScene?.setParam) activeScene.setParam(key, Number(e.target.value));
      });
      card.append(label, input);
    });
    card.appendChild(btn);
    glPanel.appendChild(card);
  });
}

function activateScene(sceneId) {
  if (activeScene) {
    destroySceneInstance(activeScene.id);
  }
  activeScene = createSceneInstance(sceneId, { theme: themeState });
  activeSceneId = sceneId;
  buildGLUI();
}

function buildPostFXUI() {
  if (!postfxPanel) return;
  postfxPanel.innerHTML = '';
  const controls = [
    { key: 'blurAmount', label: 'Blur', min: 0, max: 1 },
    { key: 'vignetteAmount', label: 'Vignette', min: 0, max: 1 },
    { key: 'chromaOffset', label: 'Chroma Offset', min: 0, max: 2 },
    { key: 'glitchAmount', label: 'Glitch', min: 0, max: 1 },
  ];
  controls.forEach((cfg) => {
    const wrap = document.createElement('label');
    wrap.textContent = cfg.label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = cfg.min;
    input.max = cfg.max;
    input.step = '0.01';
    input.value = postFXState[cfg.key];
    input.addEventListener('input', (e) => {
      postFXState[cfg.key] = Number(e.target.value);
      setPostFXSettings(postFXState);
    });
    wrap.appendChild(input);
    postfxPanel.appendChild(wrap);
  });
}

function setupPlayground() {
  playgroundUI = initCreativePlayground(playgroundPanel, (source) => {
    playgroundSource = source;
  });
}

function hydrateMotionRegistry() {
  Object.values(motionRegistry).forEach((entry) => {
    if (!entry.options) entry.options = {};
    entry.options.onUpdate = () => (canvasEngine.dirty = true);
  });
}

function bindToolbar() {
  document.querySelector('[data-action="new"]').addEventListener('click', () => {
    if (confirm('Start a new project? Current work will be replaced.')) {
      layerManager.load({ layers: [], activeId: null });
      Object.keys(motionRegistry).forEach((key) => delete motionRegistry[key]);
      if (activeScene) {
        destroySceneInstance(activeScene.id);
        activeScene = null;
        activeSceneId = null;
      }
      playgroundSource = '';
      buildMotionUI(motionPanel, layerManager, () => (canvasEngine.dirty = true));
      buildGLUI();
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
        const layerPayload = parsed.layers ? parsed : { layers: parsed.layers || [], activeId: parsed.activeId || null };
        layerManager.load(layerPayload);
        if (parsed.gl?.sceneId) {
          activateScene(parsed.gl.sceneId);
          if (parsed.gl.postFX) {
            postFXState = parsed.gl.postFX;
            setPostFXSettings(postFXState);
            buildPostFXUI();
          }
        }
        if (parsed.motion) {
          Object.assign(motionRegistry, parsed.motion);
          hydrateMotionRegistry();
          buildMotionUI(motionPanel, layerManager, () => (canvasEngine.dirty = true));
        }
        if (parsed.playground?.source) {
          playgroundSource = parsed.playground.source;
          playgroundUI?.setSource(playgroundSource);
        }
        saveAutosave();
      };
      reader.readAsText(file);
    });
    input.click();
  });

  document.querySelector('[data-action="export-html"]').addEventListener('click', () => exportToHTML(layerManager));
  document.querySelector('[data-action="export-png"]').addEventListener('click', () => exportToPNG(canvas));
  document.querySelector('[data-action="export-json"]').addEventListener('click', () =>
    exportToJSON(layerManager, {
      gl: { sceneId: activeSceneId, postFX: postFXState },
      motion: motionRegistry,
      playground: { source: playgroundSource },
    }),
  );
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
  const snapshot = JSON.stringify(projectSnapshot());
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
      const layerPayload = parsed.layers ? parsed : parsed.data ? JSON.parse(parsed.data) : null;
      if (layerPayload) {
        layerManager.load({ layers: layerPayload.layers || [], activeId: layerPayload.activeId || null });
      }
      if (parsed.gl?.sceneId) {
        activateScene(parsed.gl.sceneId);
        if (parsed.gl.postFX) {
          postFXState = parsed.gl.postFX;
          setPostFXSettings(postFXState);
          buildPostFXUI();
        }
      }
      if (parsed.playground?.source) {
        playgroundSource = parsed.playground.source;
        playgroundUI?.setSource(playgroundSource);
        runUserCode(playgroundSource);
      }
      if (parsed.motion) {
        Object.assign(motionRegistry, parsed.motion);
        hydrateMotionRegistry();
        buildMotionUI(motionPanel, layerManager, () => (canvasEngine.dirty = true));
      }
    } catch (error) {
      console.warn('Unable to load autosave', error);
    }
  }
  autosave();
}

function projectSnapshot() {
  return {
    ...layerManager.serialize(),
    gl: { sceneId: activeSceneId, postFX: postFXState },
    motion: serializeMotionRegistry(),
    playground: { source: playgroundSource },
  };
}

function serializeMotionRegistry() {
  const payload = {};
  Object.entries(motionRegistry).forEach(([key, value]) => {
    payload[key] = {
      presetId: value.presetId,
      options: { ...value.options },
    };
    delete payload[key].options.onUpdate;
  });
  return payload;
}

init();
