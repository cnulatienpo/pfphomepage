export const transformDefs = [
  { key: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1 },
  { key: 'scale', label: 'Scale', min: 0.2, max: 3, step: 0.05 },
  { key: 'x', label: 'Offset X', min: -400, max: 400, step: 5 },
  { key: 'y', label: 'Offset Y', min: -400, max: 400, step: 5 },
];

export function buildTransformUI(container, layerManager, onChange) {
  container.innerHTML = '';
  const active = layerManager.layers.find((l) => l.id === layerManager.activeId);
  if (!active) {
    container.textContent = 'Select a layer to transform';
    return;
  }
  transformDefs.forEach((def) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'filter-pill';
    const label = document.createElement('label');
    label.textContent = def.label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = def.min;
    input.max = def.max;
    input.step = def.step;
    input.value = active.transform[def.key];
    input.addEventListener('input', (e) => {
      const value = Number(e.target.value);
      layerManager.updateLayer(active.id, { transform: { ...active.transform, [def.key]: value } });
      onChange();
    });
    wrapper.append(label, input);
    container.appendChild(wrapper);
  });
}
