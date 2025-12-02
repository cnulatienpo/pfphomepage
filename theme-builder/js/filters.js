export const filterDefs = [
  { key: 'brightness', label: 'Brightness', min: 0, max: 200, step: 1 },
  { key: 'contrast', label: 'Contrast', min: 0, max: 200, step: 1 },
  { key: 'saturation', label: 'Saturation', min: 0, max: 200, step: 1 },
  { key: 'hue', label: 'Hue', min: -180, max: 180, step: 1 },
  { key: 'blur', label: 'Blur', min: 0, max: 20, step: 0.5 },
  { key: 'opacity', label: 'Opacity', min: 0, max: 100, step: 1 },
];

export function buildFiltersUI(container, layerManager, onChange) {
  container.innerHTML = '';
  const active = layerManager.layers.find((l) => l.id === layerManager.activeId);
  if (!active) {
    container.textContent = 'Select a layer to tweak filters';
    return;
  }
  filterDefs.forEach((def) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'filter-pill';
    const label = document.createElement('label');
    label.textContent = def.label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = def.min;
    input.max = def.max;
    input.step = def.step;
    input.value = active.filter[def.key];
    input.addEventListener('input', (e) => {
      const value = Number(e.target.value);
      layerManager.updateLayer(active.id, { filter: { ...active.filter, [def.key]: value } });
      onChange();
    });
    wrapper.append(label, input);
    container.appendChild(wrapper);
  });
}

export function applyFilters(ctx, filter) {
  ctx.filter = `brightness(${filter.brightness}%) contrast(${filter.contrast}%) saturate(${filter.saturation}%) hue-rotate(${filter.hue}deg) blur(${filter.blur}px)`;
}
