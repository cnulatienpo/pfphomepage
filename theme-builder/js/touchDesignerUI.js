import {
  connectToTouchDesigner,
  disconnectFromTouchDesigner,
  getChannelsSnapshot,
  getTouchDesignerConfig,
  isTouchDesignerConnected,
  onTouchDesignerMessage,
  setTouchDesignerConfig,
} from './touchDesignerEngine.js';
import {
  addMapping,
  applyTouchDesignerMappings,
  getThemeTargets,
  getTouchDesignerChannelList,
  listMappings,
  removeMapping,
  serializeMappings,
  loadMappings,
} from './touchDesignerMappings.js';
import {
  enableTouchDesignerScene,
  disableTouchDesignerScene,
  getEnabledScenes,
  initTouchDesignerScenes,
  listTouchDesignerScenes,
  setEnabledScenes,
} from './touchDesignerScenes.js';

let rootEl = null;
let channelListEl = null;
let logEl = null;
let mappingListEl = null;
let sceneListEl = null;
let connectionInput = null;
let mappingLoopHandle = null;

initTouchDesignerScenes();

export function initTouchDesignerUI(rootElement) {
  rootEl = rootElement;
  if (!rootEl) return;
  rootEl.innerHTML = '';
  rootEl.appendChild(buildConnectionPanel());
  rootEl.appendChild(buildChannelMonitor());
  rootEl.appendChild(buildMappingEditor());
  rootEl.appendChild(buildScenePanel());
  startMappingLoop();
  refreshMappingList();
  refreshSceneList();
}

export function refreshTouchDesignerUI() {
  renderChannelList();
  refreshMappingList();
  refreshSceneList();
}

function buildConnectionPanel() {
  const panel = document.createElement('div');
  panel.className = 'td-panel';
  panel.innerHTML = `
    <div class="td-panel-header">
      <div>
        <div class="td-title">Connection</div>
        <div class="td-subtitle">OSC/WebSocket bridge</div>
      </div>
      <span class="td-status" data-status="disconnected">●</span>
    </div>
    <div class="td-row">
      <label>WebSocket URL</label>
      <input type="text" class="td-input" value="${getTouchDesignerConfig().wsUrl}" />
    </div>
    <div class="td-row td-actions">
      <button class="td-btn primary">Connect</button>
      <button class="td-btn">Disconnect</button>
    </div>
    <div class="td-log" aria-live="polite"></div>
  `;

  connectionInput = panel.querySelector('input');
  logEl = panel.querySelector('.td-log');
  const statusDot = panel.querySelector('.td-status');

  const updateStatus = () => {
    const connected = isTouchDesignerConnected();
    statusDot.dataset.status = connected ? 'connected' : 'disconnected';
    statusDot.textContent = connected ? '●' : '○';
  };

  panel.querySelector('.td-btn.primary').addEventListener('click', () => {
    const url = connectionInput.value || 'ws://localhost:8083';
    connectToTouchDesigner({ wsUrl: url });
    updateStatus();
  });

  panel.querySelectorAll('.td-btn')[1].addEventListener('click', () => {
    disconnectFromTouchDesigner();
    updateStatus();
  });

  onTouchDesignerMessage((msg) => {
    appendLog(`TD → Browser: ${msg.address || msg.message || msg.type}`);
    updateStatus();
    renderChannelList();
  });

  updateStatus();
  return panel;
}

function buildChannelMonitor() {
  const panel = document.createElement('div');
  panel.className = 'td-panel';
  panel.innerHTML = `
    <div class="td-panel-header">
      <div>
        <div class="td-title">Channel Monitor</div>
        <div class="td-subtitle">Live CHOP/DAT values</div>
      </div>
    </div>
    <div class="td-channel-list"></div>
  `;
  channelListEl = panel.querySelector('.td-channel-list');
  renderChannelList();
  return panel;
}

function renderChannelList() {
  if (!channelListEl) return;
  const channels = getChannelsSnapshot();
  channelListEl.innerHTML = '';
  const names = Object.keys(channels);
  if (names.length === 0) {
    channelListEl.innerHTML = '<div class="td-empty">Waiting for TouchDesigner data...</div>';
    return;
  }
  names.forEach((name) => {
    const value = channels[name]?.value ?? 0;
    const bar = document.createElement('div');
    bar.className = 'td-channel-row';
    bar.innerHTML = `
      <span class="td-chip">${name}</span>
      <div class="td-meter"><div style="width:${Math.min(100, value * 100)}%"></div></div>
      <span class="td-value">${value.toFixed(2)}</span>
    `;
    channelListEl.appendChild(bar);
  });
}

function buildMappingEditor() {
  const panel = document.createElement('div');
  panel.className = 'td-panel';
  panel.innerHTML = `
    <div class="td-panel-header">
      <div>
        <div class="td-title">Mapping Editor</div>
        <div class="td-subtitle">Connect channels to theme knobs</div>
      </div>
    </div>
    <div class="td-row">
      <label>Channel</label>
      <select class="td-input td-channel-select"></select>
    </div>
    <div class="td-row">
      <label>Target</label>
      <select class="td-input td-target-select"></select>
    </div>
    <div class="td-row">
      <label>Smoothing</label>
      <input type="number" class="td-input td-smoothing" min="0" max="1" step="0.05" value="0.15" />
    </div>
    <div class="td-row td-actions">
      <button class="td-btn primary td-add-mapping">Add Mapping</button>
    </div>
    <div class="td-mapping-list"></div>
  `;

  mappingListEl = panel.querySelector('.td-mapping-list');
  const channelSelect = panel.querySelector('.td-channel-select');
  const targetSelect = panel.querySelector('.td-target-select');
  const smoothingInput = panel.querySelector('.td-smoothing');

  const refreshSelects = () => {
    const channelOptions = getTouchDesignerChannelList();
    const safeOptions = channelOptions.length ? channelOptions : ['beat', 'bassEnergy', 'midsEnergy', 'highsEnergy', 'motion'];
    channelSelect.innerHTML = safeOptions.map((c) => `<option value="${c}">${c}</option>`).join('');
    const targets = getThemeTargets();
    targetSelect.innerHTML = targets.map((t) => `<option value="${t.id}">${t.label}</option>`).join('');
  };

  onTouchDesignerMessage(() => refreshSelects());

  panel.querySelector('.td-add-mapping').addEventListener('click', () => {
    const source = channelSelect.value;
    const target = targetSelect.value;
    const smoothing = Number(smoothingInput.value) || 0;
    if (!source || !target) return;
    addMapping({
      source,
      target,
      direction: 'td→theme',
      mode: 'range',
      inRange: [0, 1],
      outRange: [0, 1],
      smoothing,
    });
    refreshMappingList();
  });

  refreshSelects();
  return panel;
}

function refreshMappingList() {
  if (!mappingListEl) return;
  const mappings = listMappings();
  mappingListEl.innerHTML = '';
  if (mappings.length === 0) {
    mappingListEl.innerHTML = '<div class="td-empty">No mappings yet. Drop TD channels onto targets above.</div>';
    return;
  }
  mappings.forEach((mapping) => {
    const row = document.createElement('div');
    row.className = 'td-mapping-row';
    row.innerHTML = `
      <div>
        <div class="td-chip">${mapping.source}</div>
        <div class="td-arrow">→</div>
        <div class="td-chip alt">${mapping.target}</div>
        <div class="td-meta">${mapping.mode || 'range'} · smooth ${mapping.smoothing ?? 0}</div>
      </div>
      <button class="td-btn td-remove">Remove</button>
    `;
    row.querySelector('.td-remove').addEventListener('click', () => {
      removeMapping(mapping.id);
      refreshMappingList();
    });
    mappingListEl.appendChild(row);
  });
}

function buildScenePanel() {
  const panel = document.createElement('div');
  panel.className = 'td-panel';
  panel.innerHTML = `
    <div class="td-panel-header">
      <div>
        <div class="td-title">Scene Presets</div>
        <div class="td-subtitle">TD-driven behaviors</div>
      </div>
    </div>
    <div class="td-scene-list"></div>
  `;
  sceneListEl = panel.querySelector('.td-scene-list');
  refreshSceneList();
  return panel;
}

function refreshSceneList() {
  if (!sceneListEl) return;
  const scenes = listTouchDesignerScenes();
  const enabled = new Set(getEnabledScenes());
  sceneListEl.innerHTML = '';
  scenes.forEach((scene) => {
    const row = document.createElement('div');
    row.className = 'td-scene-row';
    row.innerHTML = `
      <div>
        <div class="td-title">${scene.name}</div>
        <div class="td-subtitle">${scene.description}</div>
      </div>
      <button class="td-btn ${enabled.has(scene.id) ? 'primary' : ''}">${enabled.has(scene.id) ? 'Disable' : 'Enable'}</button>
    `;
    row.querySelector('button').addEventListener('click', () => {
      if (enabled.has(scene.id)) {
        disableTouchDesignerScene(scene.id);
      } else {
        enableTouchDesignerScene(scene.id);
      }
      refreshSceneList();
    });
    sceneListEl.appendChild(row);
  });
}

function appendLog(message) {
  if (!logEl) return;
  const line = document.createElement('div');
  const stamp = new Date().toLocaleTimeString();
  line.textContent = `[${stamp}] ${message}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function startMappingLoop() {
  if (mappingLoopHandle) cancelAnimationFrame(mappingLoopHandle);
  const loop = () => {
    applyTouchDesignerMappings();
    mappingLoopHandle = requestAnimationFrame(loop);
  };
  mappingLoopHandle = requestAnimationFrame(loop);
}

export function getTouchDesignerExportData() {
  return {
    config: getTouchDesignerConfig(),
    mappings: serializeMappings(),
    enabledScenes: getEnabledScenes(),
  };
}

export function loadTouchDesignerExportData(data = {}) {
  if (data.config) {
    setTouchDesignerConfig(data.config);
    if (data.config.wsUrl) {
      connectToTouchDesigner({ wsUrl: data.config.wsUrl });
    }
  }
  if (Array.isArray(data.mappings)) loadMappings(data.mappings);
  if (Array.isArray(data.enabledScenes)) setEnabledScenes(data.enabledScenes);
  refreshMappingList();
  refreshSceneList();
}
