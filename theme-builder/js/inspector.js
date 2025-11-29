import { defaultTransforms, defaultFilters } from './layerManager.js';
import { updateInspectorForLayer } from './lidarInspector.js';

export function renderInspector(container, layerManager) {
  container.innerHTML = '';
  const active = layerManager.layers.find((l) => l.id === layerManager.activeId);
  if (!active) {
    container.textContent = 'Select a layer to edit its properties.';
    return;
  }
  container.append(
    textField('Name', active.name, (value) => layerManager.updateLayer(active.id, { name: value })),
    numberField('Width', active.width, (value) => layerManager.updateLayer(active.id, { width: value })),
    numberField('Height', active.height, (value) => layerManager.updateLayer(active.id, { height: value })),
    selectField('Blend', active.blendMode, ['source-over', 'multiply', 'screen', 'overlay', 'soft-light'], (value) => layerManager.updateLayer(active.id, { blendMode: value })),
    toggleRow('Locked', active.locked, () => layerManager.toggleLock(active.id)),
    toggleRow('Visible', active.visible, () => layerManager.toggleVisibility(active.id)),
  );

  if (active.depthMeta) {
    updateInspectorForLayer(active.id, container, layerManager);
  }
}

function textField(label, value, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'property-field';
  const lab = document.createElement('label');
  lab.textContent = label;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.addEventListener('input', (e) => onChange(e.target.value));
  wrap.append(lab, input);
  return wrap;
}

function numberField(label, value, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'property-field';
  const lab = document.createElement('label');
  lab.textContent = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.value = value;
  input.addEventListener('input', (e) => onChange(Number(e.target.value)));
  wrap.append(lab, input);
  return wrap;
}

function selectField(label, value, options, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'property-field';
  const lab = document.createElement('label');
  lab.textContent = label;
  const select = document.createElement('select');
  options.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    if (opt === value) option.selected = true;
    select.appendChild(option);
  });
  select.addEventListener('change', (e) => onChange(e.target.value));
  wrap.append(lab, select);
  return wrap;
}

function toggleRow(label, value, onToggle) {
  const row = document.createElement('div');
  row.className = 'toggle-row';
  const lab = document.createElement('span');
  lab.textContent = label;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = value;
  input.addEventListener('change', onToggle);
  row.append(lab, input);
  return row;
}
