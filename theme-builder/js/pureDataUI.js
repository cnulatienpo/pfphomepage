import {
  connectToPureData,
  disconnectFromPureData,
  getChannelSnapshot,
  getPureDataStatus,
  sendToPureData,
  subscribeStatus,
} from './pureDataEngine.js';
import {
  THEME_EVENTS,
  THEME_TARGETS,
  createMapping,
  getThemeEventChannel,
  listMappings,
  removeMapping,
  setThemeEventChannel,
  startMappingLoop,
} from './pureDataMappings.js';

export function initPureDataUI(root, options = {}) {
  if (!root) return;
  root.classList.add('pd-control-room');
  root.innerHTML = layoutTemplate();
  const statusBulb = root.querySelector('.pd-status');
  const statusLabel = root.querySelector('.pd-status-label');
  const wsInput = root.querySelector('#pd-ws-url');
  const connectBtn = root.querySelector('#pd-connect');
  const disconnectBtn = root.querySelector('#pd-disconnect');
  const channelList = root.querySelector('#pd-channel-list');
  const mappingList = root.querySelector('#pd-mapping-list');
  const mappingForm = root.querySelector('#pd-mapping-form');
  const themeEventList = root.querySelector('#pd-event-bindings');
  const sendTestBtn = root.querySelector('#pd-send-test');
  const eventChannelInput = root.querySelector('#pd-event-channel');

  wsInput.value = options.defaultUrl || 'ws://localhost:8082';

  connectBtn.addEventListener('click', () => {
    connectToPureData({ wsUrl: wsInput.value.trim() });
  });
  disconnectBtn.addEventListener('click', () => disconnectFromPureData());

  mappingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(mappingForm);
    createMapping({
      sourceChannel: formData.get('pd-source') || 'channel',
      targetProperty: formData.get('theme-target'),
      direction: formData.get('direction'),
      transform: {
        inMin: Number(formData.get('in-min') || 0),
        inMax: Number(formData.get('in-max') || 1),
        outMin: Number(formData.get('out-min') || 0),
        outMax: Number(formData.get('out-max') || 1),
        curve: formData.get('curve'),
        smoothing: Number(formData.get('smoothing') || 0),
      },
    });
    mappingForm.reset();
    renderMappings(mappingList);
  });

  renderTargets(mappingForm.querySelector('select[name="theme-target"]'));
  renderMappings(mappingList);
  renderEventBindings(themeEventList);

  sendTestBtn.addEventListener('click', () => {
    const channel = eventChannelInput.value || 'button_click';
    sendToPureData(channel, 1);
  });

  subscribeStatus((state) => updateStatus(state, statusBulb, statusLabel, options.statusElement));
  updateStatus(getPureDataStatus(), statusBulb, statusLabel, options.statusElement);

  const monitorLoop = () => {
    renderChannelList(channelList);
    requestAnimationFrame(monitorLoop);
  };
  requestAnimationFrame(monitorLoop);
  startMappingLoop();
}

function updateStatus(state, bulb, label, chip) {
  bulb.dataset.state = state;
  label.textContent = state === 'connected' ? 'Connected to Pd' : state === 'connecting' ? 'Connecting...' : 'Offline';
  if (chip) {
    chip.dataset.state = state;
    chip.textContent = state === 'connected' ? 'Pd Link: Online' : 'Pd Link: Offline';
  }
}

function layoutTemplate() {
  return `
    <div class="pd-connection">
      <div class="pd-connection-row">
        <div class="pd-status" data-state="disconnected"></div>
        <div class="pd-status-label">Offline</div>
      </div>
      <label class="pd-field">
        <span>WebSocket Bridge</span>
        <input id="pd-ws-url" type="text" value="ws://localhost:8082" placeholder="ws://localhost:8082" />
      </label>
      <div class="pd-buttons">
        <button id="pd-connect">Connect</button>
        <button id="pd-disconnect" type="button">Disconnect</button>
        <button id="pd-send-test" type="button">Ping Pd</button>
        <input id="pd-event-channel" type="text" placeholder="pd channel name" class="pd-inline-input" />
      </div>
    </div>
    <div class="pd-columns">
      <div>
        <h4>Channel Monitor</h4>
        <div id="pd-channel-list" class="pd-channel-list"></div>
      </div>
      <div>
        <h4>Theme Events → Pd</h4>
        <div id="pd-event-bindings" class="pd-event-list"></div>
      </div>
    </div>
    <div class="pd-mapping-panel">
      <div class="pd-mapping-head">
        <h4>Create Mapping</h4>
        <p class="pd-hint">Drag a Pd channel over to a toy control. Use ranges to tame signals.</p>
      </div>
      <form id="pd-mapping-form" class="pd-mapping-form">
        <label class="pd-field">Pd Channel <input name="pd-source" type="text" placeholder="kick" required /></label>
        <label class="pd-field">
          Direction
          <select name="direction">
            <option value="pd→theme">Pd → Theme</option>
            <option value="theme→pd">Theme → Pd</option>
          </select>
        </label>
        <label class="pd-field">Theme Target <select name="theme-target"></select></label>
        <div class="pd-grid">
          <label class="pd-field">In Min <input name="in-min" type="number" step="0.01" value="0" /></label>
          <label class="pd-field">In Max <input name="in-max" type="number" step="0.01" value="1" /></label>
          <label class="pd-field">Out Min <input name="out-min" type="number" step="0.01" value="0" /></label>
          <label class="pd-field">Out Max <input name="out-max" type="number" step="0.01" value="1" /></label>
          <label class="pd-field">
            Curve
            <select name="curve">
              <option value="linear">Linear</option>
              <option value="exp">Exponential</option>
              <option value="log">Log</option>
            </select>
          </label>
          <label class="pd-field">Smoothing (0-1)<input name="smoothing" type="number" step="0.05" value="0" /></label>
        </div>
        <button type="submit">Add Mapping</button>
      </form>
      <div id="pd-mapping-list" class="pd-mapping-list"></div>
    </div>
  `;
}

function renderChannelList(container) {
  const channels = getChannelSnapshot().sort((a, b) => b.lastUpdated - a.lastUpdated).slice(0, 10);
  container.innerHTML = '';
  channels.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'pd-channel-row';
    const bar = document.createElement('div');
    bar.className = 'pd-meter';
    const norm = Math.min(1, Math.abs(entry.value));
    bar.style.setProperty('--pd-meter', norm);
    row.innerHTML = `<div class="pd-channel-name">${entry.channel}</div><div class="pd-channel-value">${entry.value.toFixed(
      2,
    )}</div>`;
    row.appendChild(bar);
    container.appendChild(row);
  });
  if (!channels.length) {
    container.innerHTML = '<p class="pd-hint">Waiting for Pd chatter…</p>';
  }
}

function renderMappings(container) {
  const items = listMappings();
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = '<p class="pd-hint">No mappings yet. Drag a Pd channel to a target to start.</p>';
    return;
  }
  items.forEach((mapping) => {
    const row = document.createElement('div');
    row.className = 'pd-mapping-row';
    row.innerHTML = `
      <div>
        <div class="pd-chip">${mapping.direction}</div>
        <div class="pd-label">${mapping.sourceChannel} → ${lookupTargetLabel(mapping.targetProperty)}</div>
        <div class="pd-sub">${mapping.transform.inMin}..${mapping.transform.inMax} mapped to ${mapping.transform.outMin}..${
      mapping.transform.outMax
    } (${mapping.transform.curve})</div>
      </div>
    `;
    const remove = document.createElement('button');
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      removeMapping(mapping.id);
      renderMappings(container);
    });
    row.appendChild(remove);
    container.appendChild(row);
  });
}

function renderTargets(selectEl) {
  selectEl.innerHTML = '';
  THEME_TARGETS.forEach((target) => {
    const opt = document.createElement('option');
    opt.value = target.id;
    opt.textContent = target.label;
    selectEl.appendChild(opt);
  });
}

function renderEventBindings(container) {
  container.innerHTML = '';
  THEME_EVENTS.forEach((evt) => {
    const row = document.createElement('div');
    row.className = 'pd-event-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Pd channel';
    input.value = getThemeEventChannel(evt.id);
    input.addEventListener('input', () => setThemeEventChannel(evt.id, input.value.trim()));
    const label = document.createElement('div');
    label.className = 'pd-label';
    label.textContent = evt.label;
    row.append(label, input);
    container.appendChild(row);
  });
  const warn = document.createElement('p');
  warn.className = 'pd-hint';
  warn.textContent = 'Assign Pd channel names to theme events. When the toy UI fires, Pd gets a ping!';
  container.appendChild(warn);
}

function lookupTargetLabel(id) {
  return THEME_TARGETS.find((t) => t.id === id)?.label || id;
}

export function updatePureDataUI(root) {
  if (!root) return;
  const statusBulb = root.querySelector('.pd-status');
  const statusLabel = root.querySelector('.pd-status-label');
  const chip = document.querySelector('[data-role="pd-chip"]');
  updateStatus(getPureDataStatus(), statusBulb, statusLabel, chip);
}
