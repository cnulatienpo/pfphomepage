// TouchDesigner Control Room Panel UI
// Exports initTouchDesignerPanel, updateConnectionStatus, and setChannels

const TOUCH_DESIGNER_CONNECT_EVENT = 'ui:touchDesignerConnect';

let statusElement = null;
let channelsListElement = null;
let targets = [];
let mappingState = [];
let currentChannels = [];
let connectCallback = null;
let mappingChangeCallback = null;

const CHANNEL_TOOLTIPS = {
  'Beat Light': 'This number goes up when the beat hits.',
  'Camera Move': 'This number changes when the camera sees motion.'
};

const TARGETS = [
  {
    id: 'move-background',
    label: 'Move Background',
    tooltip: 'Let the other app move the live background.',
    reaction: 'Background Drift'
  },
  {
    id: 'move-boxes',
    label: 'Move Boxes',
    tooltip: 'Let it wiggle boxes.',
    reaction: 'Box Wiggle'
  },
  {
    id: 'move-colors',
    label: 'Move Colors',
    tooltip: 'Let it change colors.',
    reaction: 'Color Shift'
  }
];

function createPanelHeader(container) {
  const header = document.createElement('div');
  header.className = 'td-panel-header';

  const title = document.createElement('h2');
  title.textContent = 'Other Machines Steer This';

  const subtitle = document.createElement('p');
  subtitle.className = 'td-panel-subtitle';
  subtitle.textContent = 'Let another app move the page.';

  header.appendChild(title);
  header.appendChild(subtitle);
  container.appendChild(header);
}

function createConnectionSection(container) {
  const section = document.createElement('div');
  section.className = 'td-connection-section';

  const button = document.createElement('button');
  button.className = 'td-connect-button';
  button.textContent = 'Connect To Big Visual Machine';
  button.title = 'Hook the page to the outside visual tool.';

  button.addEventListener('click', () => {
    const evt = new CustomEvent(TOUCH_DESIGNER_CONNECT_EVENT, { bubbles: true });
    container.dispatchEvent(evt);
    if (typeof connectCallback === 'function') {
      connectCallback();
    }
  });

  const statusWrapper = document.createElement('div');
  statusWrapper.className = 'td-status-wrapper';

  const statusLabel = document.createElement('span');
  statusLabel.className = 'td-status-label';
  statusLabel.textContent = 'Status:';

  statusElement = document.createElement('span');
  statusElement.className = 'td-status-text';
  statusElement.textContent = 'Not connected';
  statusElement.title = 'Shows if the outside app is linked.';

  statusWrapper.appendChild(statusLabel);
  statusWrapper.appendChild(statusElement);

  section.appendChild(button);
  section.appendChild(statusWrapper);
  container.appendChild(section);
}

function createChannelsSection(container) {
  const section = document.createElement('div');
  section.className = 'td-channels-section';

  const heading = document.createElement('h3');
  heading.textContent = 'Channels';
  section.appendChild(heading);

  channelsListElement = document.createElement('div');
  channelsListElement.className = 'td-channels-list';
  section.appendChild(channelsListElement);

  container.appendChild(section);
}

function buildChannelRow(channel) {
  const row = document.createElement('div');
  row.className = 'td-channel-row';
  row.draggable = true;
  row.dataset.channelName = channel.name;
  row.title = CHANNEL_TOOLTIPS[channel.name] || 'Drag to connect this number.';

  row.addEventListener('dragstart', (event) => {
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('text/plain', channel.name);
    row.classList.add('td-dragging');
  });

  row.addEventListener('dragend', () => {
    row.classList.remove('td-dragging');
  });

  const name = document.createElement('span');
  name.className = 'td-channel-name';
  name.textContent = channel.name;

  const value = document.createElement('span');
  value.className = 'td-channel-value';
  value.textContent = formatChannelValue(channel.value);

  row.appendChild(name);
  row.appendChild(value);
  return row;
}

function createTargetsSection(container) {
  const section = document.createElement('div');
  section.className = 'td-targets-section';

  const heading = document.createElement('h3');
  heading.textContent = 'Simple Targets';
  section.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'td-target-grid';

  targets = TARGETS.map((target) => {
    const card = document.createElement('div');
    card.className = 'td-target-card';
    card.dataset.targetId = target.id;
    card.title = target.tooltip;

    card.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      card.classList.add('td-target-hover');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('td-target-hover');
    });

    card.addEventListener('drop', (event) => {
      event.preventDefault();
      card.classList.remove('td-target-hover');
      const channelName = event.dataTransfer.getData('text/plain');
      if (channelName) {
        updateMapping(target.id, channelName);
      }
    });

    const label = document.createElement('div');
    label.className = 'td-target-label';
    label.textContent = target.label;

    const mapping = document.createElement('div');
    mapping.className = 'td-target-mapping';

    card.appendChild(label);
    card.appendChild(mapping);
    grid.appendChild(card);

    return { ...target, element: card, mappingElement: mapping };
  });

  section.appendChild(grid);
  container.appendChild(section);
}

function formatChannelValue(value) {
  if (Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(2);
}

function updateMapping(targetId, channelName) {
  const target = targets.find((t) => t.id === targetId);
  if (!target) return;

  const mappingText = `${channelName} → ${target.reaction}`;
  mappingState = mappingState.filter((m) => m.targetId !== targetId);
  mappingState.push({ targetId, channelName, reaction: target.reaction });

  target.mappingElement.textContent = mappingText;
  target.mappingElement.title = `Every time ${channelName} changes, this card jumps.`;
  target.element.classList.add('td-has-mapping');

  if (typeof mappingChangeCallback === 'function') {
    const report = mappingState.map((m) => ({ targetId: m.targetId, channelName: m.channelName }));
    mappingChangeCallback(report);
  }
}

function renderChannels() {
  if (!channelsListElement) return;
  channelsListElement.innerHTML = '';
  currentChannels.forEach((channel) => {
    const row = buildChannelRow(channel);
    channelsListElement.appendChild(row);
  });
}

export function setChannels(channelsArray) {
  currentChannels = Array.isArray(channelsArray) ? channelsArray : [];
  renderChannels();
}

export function updateConnectionStatus(statusText) {
  if (statusElement) {
    statusElement.textContent = statusText;
  }
}

export function initTouchDesignerPanel(containerElement, callbacks = {}) {
  if (!containerElement) return null;
  connectCallback = callbacks.onConnect || null;
  mappingChangeCallback = callbacks.onChannelMappingChange || null;

  containerElement.classList.add('td-panel');

  createPanelHeader(containerElement);
  createConnectionSection(containerElement);
  createChannelsSection(containerElement);
  createTargetsSection(containerElement);
  renderChannels();

  return {
    updateConnectionStatus,
    setChannels,
  };
}

