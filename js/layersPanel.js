const state = {
  container: null,
  listEl: null,
  layers: [],
  selectedId: null,
};

function emit(eventName, detail) {
  if (!state.container) return;
  state.container.dispatchEvent(new CustomEvent(eventName, { detail }));
}

function createIcon(label, icon) {
  const span = document.createElement('span');
  span.className = 'layers-panel__icon';
  span.textContent = icon;
  span.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.className = 'layers-panel__icon-label';
  text.textContent = label;

  const wrapper = document.createElement('span');
  wrapper.className = 'layers-panel__icon-wrapper';
  wrapper.appendChild(span);
  wrapper.appendChild(text);

  return wrapper;
}

function setSelection(id) {
  state.selectedId = id;
  if (!state.listEl) return;
  state.listEl.querySelectorAll('.layers-panel__layer').forEach((row) => {
    row.classList.toggle('layers-panel__layer--selected', row.dataset.id === id);
  });
}

function handleReorder(draggedId, targetId) {
  if (draggedId === targetId) return;
  const currentIndex = state.layers.findIndex((layer) => layer.id === draggedId);
  const targetIndex = state.layers.findIndex((layer) => layer.id === targetId);
  if (currentIndex === -1 || targetIndex === -1) return;

  const [moved] = state.layers.splice(currentIndex, 1);
  state.layers.splice(targetIndex, 0, moved);
  renderLayers();
  emit('ui:layerOrderChanged', { order: state.layers.map((layer) => layer.id) });
}

function createLayerRow(layer, index) {
  const row = document.createElement('div');
  row.className = 'layers-panel__layer';
  row.dataset.id = layer.id;
  row.setAttribute('role', 'listitem');
  row.setAttribute('aria-label', `${layer.name} layer`);
  row.draggable = true;

  const dragHandle = document.createElement('div');
  dragHandle.className = 'layers-panel__drag';
  dragHandle.title = 'Grab here to move this up or down in the stack.';
  dragHandle.textContent = '⋮⋮';

  dragHandle.addEventListener('dragstart', (event) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', layer.id);
    row.classList.add('layers-panel__layer--dragging');
  });

  dragHandle.addEventListener('dragend', () => {
    row.classList.remove('layers-panel__layer--dragging');
  });

  row.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  });

  row.addEventListener('drop', (event) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData('text/plain');
    handleReorder(draggedId, layer.id);
  });

  row.addEventListener('click', () => setSelection(layer.id));

  const thumb = document.createElement('div');
  thumb.className = 'layers-panel__thumb';
  thumb.style.backgroundColor = index % 2 === 0 ? '#a5b4fc' : '#f9a8d4';

  const name = document.createElement('div');
  name.className = 'layers-panel__name';
  name.textContent = layer.name;

  const controls = document.createElement('div');
  controls.className = 'layers-panel__controls';

  const visibilityButton = document.createElement('button');
  visibilityButton.className = 'layers-panel__btn';
  visibilityButton.type = 'button';
  visibilityButton.title = 'Turn this thing off or on. It stays in the pile.';
  visibilityButton.appendChild(createIcon('Show', '👁'));
  visibilityButton.setAttribute('aria-pressed', layer.visible);
  if (!layer.visible) {
    visibilityButton.classList.add('layers-panel__btn--inactive');
  }
  visibilityButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const newValue = !layer.visible;
    layer.visible = newValue;
    renderLayers();
    emit('ui:layerVisibilityChanged', { id: layer.id, visible: newValue });
  });

  const lockButton = document.createElement('button');
  lockButton.className = 'layers-panel__btn';
  lockButton.type = 'button';
  lockButton.title = 'Stop this thing from moving when you click around.';
  lockButton.appendChild(createIcon('Lock', '🔒'));
  lockButton.setAttribute('aria-pressed', layer.locked);
  if (layer.locked) {
    lockButton.classList.add('layers-panel__btn--active');
  }
  lockButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const newValue = !layer.locked;
    layer.locked = newValue;
    renderLayers();
    emit('ui:layerLockChanged', { id: layer.id, locked: newValue });
  });

  const cloneButton = document.createElement('button');
  cloneButton.className = 'layers-panel__btn';
  cloneButton.type = 'button';
  cloneButton.title = 'Make another one just like this.';
  cloneButton.appendChild(createIcon('Copy', '📄'));
  cloneButton.addEventListener('click', (event) => {
    event.stopPropagation();
    emit('ui:layerCloned', { id: layer.id });
  });

  const removeButton = document.createElement('button');
  removeButton.className = 'layers-panel__btn layers-panel__btn--danger';
  removeButton.type = 'button';
  removeButton.title = 'Take this thing off the page.';
  removeButton.appendChild(createIcon('Remove', '🗑'));
  removeButton.addEventListener('click', (event) => {
    event.stopPropagation();
    state.layers = state.layers.filter((entry) => entry.id !== layer.id);
    if (state.selectedId === layer.id) {
      state.selectedId = state.layers[0]?.id || null;
    }
    renderLayers();
    emit('ui:layerRemoved', { id: layer.id });
  });

  const opacityWrapper = document.createElement('label');
  opacityWrapper.className = 'layers-panel__opacity';
  opacityWrapper.title = 'Slide left to fade it away. Slide right to make it solid.';
  opacityWrapper.textContent = 'See-Through';

  const opacitySlider = document.createElement('input');
  opacitySlider.type = 'range';
  opacitySlider.min = '0';
  opacitySlider.max = '100';
  opacitySlider.value = layer.opacity ?? 100;
  opacitySlider.addEventListener('click', (event) => event.stopPropagation());
  opacitySlider.addEventListener('input', () => {
    const value = parseInt(opacitySlider.value, 10);
    layer.opacity = value;
    emit('ui:layerOpacityChanged', { id: layer.id, opacity: value });
  });

  opacityWrapper.appendChild(opacitySlider);

  controls.appendChild(visibilityButton);
  controls.appendChild(lockButton);
  controls.appendChild(cloneButton);
  controls.appendChild(removeButton);
  controls.appendChild(opacityWrapper);

  const rowInfo = document.createElement('div');
  rowInfo.className = 'layers-panel__info';
  rowInfo.appendChild(name);
  rowInfo.appendChild(controls);

  row.appendChild(dragHandle);
  row.appendChild(thumb);
  row.appendChild(rowInfo);

  if (state.selectedId === layer.id) {
    row.classList.add('layers-panel__layer--selected');
  }

  return row;
}

function renderLayers() {
  if (!state.listEl) return;
  state.listEl.innerHTML = '';
  state.layers.forEach((layer, index) => {
    const row = createLayerRow(layer, index);
    state.listEl.appendChild(row);
  });
}

export function initLayersPanel(containerElement) {
  state.container = containerElement;
  state.container.classList.add('layers-panel');
  state.container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'layers-panel__header';

  const title = document.createElement('div');
  title.className = 'layers-panel__title';
  title.textContent = 'Stack Of Things';

  const help = document.createElement('div');
  help.className = 'layers-panel__help';
  help.textContent = 'This is the pile. Things at the top are on top. Things at the bottom are behind.';

  header.appendChild(title);
  header.appendChild(help);

  const list = document.createElement('div');
  list.className = 'layers-panel__list';
  list.setAttribute('role', 'list');

  state.listEl = list;

  state.container.appendChild(header);
  state.container.appendChild(list);

  return state.container;
}

export function setLayers(layersArray) {
  state.layers = Array.isArray(layersArray) ? [...layersArray] : [];
  if (!state.selectedId && state.layers[0]) {
    state.selectedId = state.layers[0].id;
  } else if (state.selectedId && !state.layers.find((layer) => layer.id === state.selectedId)) {
    state.selectedId = state.layers[0]?.id || null;
  }
  renderLayers();
}
