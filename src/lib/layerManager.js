const blendModes = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity'
]

const defaultProperties = {
  opacity: 1,
  blendMode: 'normal',
  locked: false,
  hidden: false,
  transform: 'none',
  zIndex: 0
}

const defaultTypes = ['image', 'text', 'component', 'color', 'pattern']

const fisherPriceColors = ['#FFB703', '#8ECAE6', '#FB8500', '#219EBC', '#FF5C8A', '#A4FF6E']

const createId = () => {
  const hasCrypto = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  return `layer-${hasCrypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`
}

function injectStyles() {
  if (document.getElementById('layer-manager-styles')) return
  const style = document.createElement('style')
  style.id = 'layer-manager-styles'
  style.textContent = `
    .layer-manager { font-family: 'Inter', system-ui, sans-serif; background: #0b1728; color: #0b1728; padding: 12px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.35); border: 3px solid #0b1728; }
    .layer-manager__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .layer-manager__title { font-weight: 800; font-size: 18px; color: #fff; letter-spacing: 0.4px; }
    .layer-manager__actions { display: flex; gap: 8px; }
    .layer-manager__btn { border: none; border-radius: 10px; padding: 8px 12px; font-weight: 700; cursor: pointer; background: #f0f4ff; color: #0b1728; transition: transform 120ms ease, box-shadow 120ms ease; box-shadow: 0 6px 0 #0b1728; }
    .layer-manager__btn:active { transform: translateY(2px); box-shadow: 0 4px 0 #0b1728; }
    .layer-manager__list { display: flex; flex-direction: column; gap: 10px; }
    .layer-card { background: #fff; border-radius: 14px; padding: 12px; display: grid; grid-template-columns: 44px 1fr auto; gap: 10px; align-items: center; box-shadow: 0 8px 0 #0b1728; cursor: grab; border: 3px solid #0b1728; }
    .layer-card:active { cursor: grabbing; }
    .layer-card__swatch { width: 44px; height: 44px; border-radius: 12px; border: 3px solid #0b1728; display: grid; place-items: center; font-weight: 800; color: #0b1728; background: #fff; }
    .layer-card__body { display: flex; flex-direction: column; gap: 8px; }
    .layer-card__row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .layer-card__name { font-weight: 800; font-size: 16px; color: #0b1728; border: 3px solid #0b1728; border-radius: 10px; padding: 6px 8px; width: min(260px, 100%); }
    .layer-card__control { border: 3px solid #0b1728; border-radius: 10px; padding: 6px 8px; font-weight: 700; color: #0b1728; background: #f0f4ff; box-shadow: inset 0 2px 0 rgba(0,0,0,0.08); }
    .layer-card__control--slider { accent-color: #0b1728; cursor: pointer; }
    .layer-card__control--select { cursor: pointer; }
    .layer-card__control--toggle { background: #fff; min-width: 70px; text-align: center; }
    .layer-card__actions { display: flex; gap: 6px; }
    .layer-card__icon-btn { border: 3px solid #0b1728; background: #f0f4ff; border-radius: 10px; padding: 6px 10px; cursor: pointer; font-weight: 800; box-shadow: 0 4px 0 #0b1728; }
    .layer-card__icon-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #0b1728; }
    .layer-card[data-hidden="true"] { opacity: 0.7; }
    .layer-card[data-locked="true"] { filter: grayscale(0.8); }
  `
  document.head.appendChild(style)
}

function createLayerData(type = 'component', name = 'Layer', elementRef = null) {
  return {
    id: createId(),
    type,
    elementRef,
    properties: { ...defaultProperties },
    name
  }
}

function deepCloneState(layers) {
  return layers.map(layer => ({
    id: layer.id,
    type: layer.type,
    elementRef: layer.elementRef,
    name: layer.name,
    properties: { ...layer.properties }
  }))
}

export function createLayerManager(root, initialLayers = []) {
  if (!root) throw new Error('A root element is required for layer manager.')
  injectStyles()

  const state = {
    layers: initialLayers.length ? initialLayers.map(layer => ({
      ...layer,
      properties: { ...defaultProperties, ...(layer.properties || {}) }
    })) : []
  }

  const container = document.createElement('div')
  container.className = 'layer-manager'

  const header = document.createElement('div')
  header.className = 'layer-manager__header'

  const title = document.createElement('div')
  title.className = 'layer-manager__title'
  title.textContent = 'Layers'

  const actions = document.createElement('div')
  actions.className = 'layer-manager__actions'

  const addBtn = document.createElement('button')
  addBtn.className = 'layer-manager__btn'
  addBtn.textContent = '+ Layer'
  addBtn.onclick = () => createLayer()

  const addTypeSelect = document.createElement('select')
  addTypeSelect.className = 'layer-manager__btn'
  defaultTypes.forEach(t => {
    const opt = document.createElement('option')
    opt.value = t
    opt.textContent = t
    addTypeSelect.appendChild(opt)
  })

  actions.appendChild(addTypeSelect)
  actions.appendChild(addBtn)
  header.appendChild(title)
  header.appendChild(actions)

  const list = document.createElement('div')
  list.className = 'layer-manager__list'

  container.appendChild(header)
  container.appendChild(list)
  root.appendChild(container)

  let draggingId = null

  function syncZIndex() {
    state.layers.forEach((layer, idx) => {
      layer.properties.zIndex = state.layers.length - idx
    })
  }

  function createLayer(type = addTypeSelect.value, name) {
    const label = name || `${type} ${state.layers.length + 1}`
    const layer = createLayerData(type, label)
    layer.properties.zIndex = state.layers.length + 1
    state.layers.unshift(layer)
    render()
    return layer
  }

  function deleteLayer(id) {
    state.layers = state.layers.filter(layer => layer.id !== id)
    render()
  }

  function duplicateLayer(id) {
    const source = state.layers.find(l => l.id === id)
    if (!source) return null
    const copy = createLayerData(source.type, `${source.name} copy`, source.elementRef)
    copy.properties = { ...source.properties, locked: false }
    state.layers.unshift(copy)
    syncZIndex()
    render()
    return copy
  }

  function renameLayer(id, name) {
    const layer = state.layers.find(l => l.id === id)
    if (layer) layer.name = name
  }

  function toggleHidden(id) {
    const layer = state.layers.find(l => l.id === id)
    if (layer) layer.properties.hidden = !layer.properties.hidden
  }

  function toggleLocked(id) {
    const layer = state.layers.find(l => l.id === id)
    if (layer) layer.properties.locked = !layer.properties.locked
  }

  function setOpacity(id, opacity) {
    const layer = state.layers.find(l => l.id === id)
    if (layer) layer.properties.opacity = Math.max(0, Math.min(1, opacity))
  }

  function setBlendMode(id, blendMode) {
    const layer = state.layers.find(l => l.id === id)
    if (layer) layer.properties.blendMode = blendMode
  }

  function reorderLayer(id, targetId) {
    if (id === targetId) return
    const fromIdx = state.layers.findIndex(l => l.id === id)
    const toIdx = state.layers.findIndex(l => l.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const [moved] = state.layers.splice(fromIdx, 1)
    state.layers.splice(toIdx, 0, moved)
    syncZIndex()
  }

  function getState() {
    return deepCloneState(state.layers)
  }

  function handleDragStart(ev, id) {
    draggingId = id
    ev.dataTransfer.effectAllowed = 'move'
    ev.dataTransfer.setData('text/plain', id)
  }

  function handleDrop(ev, targetId) {
    ev.preventDefault()
    const sourceId = draggingId || ev.dataTransfer.getData('text/plain')
    reorderLayer(sourceId, targetId)
    draggingId = null
    render()
  }

  function render() {
    list.innerHTML = ''
    syncZIndex()
    state.layers.forEach((layer, idx) => {
      const card = document.createElement('div')
      card.className = 'layer-card'
      card.dataset.hidden = String(layer.properties.hidden)
      card.dataset.locked = String(layer.properties.locked)
      card.draggable = true
      card.ondragstart = ev => handleDragStart(ev, layer.id)
      card.ondragover = ev => ev.preventDefault()
      card.ondrop = ev => handleDrop(ev, layer.id)

      const swatch = document.createElement('div')
      swatch.className = 'layer-card__swatch'
      swatch.style.backgroundColor = fisherPriceColors[idx % fisherPriceColors.length]
      swatch.textContent = layer.type[0].toUpperCase()

      const body = document.createElement('div')
      body.className = 'layer-card__body'

      const topRow = document.createElement('div')
      topRow.className = 'layer-card__row'

      const nameInput = document.createElement('input')
      nameInput.className = 'layer-card__name'
      nameInput.value = layer.name
      nameInput.onchange = e => renameLayer(layer.id, e.target.value)

      const hideBtn = document.createElement('button')
      hideBtn.className = 'layer-card__control layer-card__control--toggle'
      hideBtn.textContent = layer.properties.hidden ? 'Show' : 'Hide'
      hideBtn.onclick = () => {
        toggleHidden(layer.id)
        render()
      }

      const lockBtn = document.createElement('button')
      lockBtn.className = 'layer-card__control layer-card__control--toggle'
      lockBtn.textContent = layer.properties.locked ? 'Unlock' : 'Lock'
      lockBtn.onclick = () => {
        toggleLocked(layer.id)
        render()
      }

      topRow.appendChild(nameInput)
      topRow.appendChild(hideBtn)
      topRow.appendChild(lockBtn)

      const controlsRow = document.createElement('div')
      controlsRow.className = 'layer-card__row'

      const opacityLabel = document.createElement('label')
      opacityLabel.textContent = `Opacity: ${(layer.properties.opacity * 100).toFixed(0)}%`
      const opacitySlider = document.createElement('input')
      opacitySlider.type = 'range'
      opacitySlider.min = '0'
      opacitySlider.max = '100'
      opacitySlider.value = String(layer.properties.opacity * 100)
      opacitySlider.className = 'layer-card__control layer-card__control--slider'
      opacitySlider.oninput = e => {
        const value = Number(e.target.value) / 100
        setOpacity(layer.id, value)
        opacityLabel.textContent = `Opacity: ${(value * 100).toFixed(0)}%`
      }

      const blendSelect = document.createElement('select')
      blendSelect.className = 'layer-card__control layer-card__control--select'
      blendModes.forEach(mode => {
        const opt = document.createElement('option')
        opt.value = mode
        opt.textContent = mode
        blendSelect.appendChild(opt)
      })
      blendSelect.value = layer.properties.blendMode
      blendSelect.onchange = e => setBlendMode(layer.id, e.target.value)

      controlsRow.appendChild(opacityLabel)
      controlsRow.appendChild(opacitySlider)
      controlsRow.appendChild(blendSelect)

      const actionsRow = document.createElement('div')
      actionsRow.className = 'layer-card__actions'

      const duplicateBtn = document.createElement('button')
      duplicateBtn.className = 'layer-card__icon-btn'
      duplicateBtn.textContent = 'Copy'
      duplicateBtn.onclick = () => duplicateLayer(layer.id)

      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'layer-card__icon-btn'
      deleteBtn.textContent = 'Delete'
      deleteBtn.onclick = () => deleteLayer(layer.id)

      actionsRow.appendChild(duplicateBtn)
      actionsRow.appendChild(deleteBtn)

      body.appendChild(topRow)
      body.appendChild(controlsRow)
      body.appendChild(actionsRow)

      const meta = document.createElement('div')
      meta.style.display = 'grid'
      meta.style.rowGap = '6px'

      const idTag = document.createElement('div')
      idTag.className = 'layer-card__control'
      idTag.textContent = `id: ${layer.id}`
      const typeTag = document.createElement('div')
      typeTag.className = 'layer-card__control'
      typeTag.textContent = `type: ${layer.type}`
      const zTag = document.createElement('div')
      zTag.className = 'layer-card__control'
      zTag.textContent = `z: ${layer.properties.zIndex}`

      meta.appendChild(idTag)
      meta.appendChild(typeTag)
      meta.appendChild(zTag)

      card.appendChild(swatch)
      card.appendChild(body)
      card.appendChild(meta)

      list.appendChild(card)
    })
  }

  render()

  return {
    createLayer,
    deleteLayer,
    duplicateLayer,
    renameLayer,
    toggleHidden,
    toggleLocked,
    setOpacity,
    setBlendMode,
    reorderLayer,
    getState,
    render,
    root: container
  }
}
