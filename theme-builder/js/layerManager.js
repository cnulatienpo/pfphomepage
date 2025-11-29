export class LayerManager {
  constructor() {
    this.layers = [];
    this.activeId = null;
    this._id = 0;
    this.subscribers = new Set();
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  notify() {
    this.subscribers.forEach((fn) => fn(this.layers, this.activeId));
  }

  createLayer(payload) {
    const layer = {
      id: ++this._id,
      name: payload.name || `Layer ${this._id}`,
      type: payload.type || 'image',
      src: payload.src || null,
      x: payload.x || 100,
      y: payload.y || 100,
      width: payload.width || 200,
      height: payload.height || 200,
      opacity: payload.opacity ?? 1,
      visible: payload.visible ?? true,
      locked: payload.locked ?? false,
      blendMode: payload.blendMode || 'source-over',
      filter: payload.filter || defaultFilters(),
      transform: payload.transform || defaultTransforms(),
      content: payload.content || '',
      classes: payload.classes || [],
    };
    this.layers.unshift(layer);
    this.activeId = layer.id;
    this.notify();
    return layer;
  }

  setActive(id) {
    this.activeId = id;
    this.notify();
  }

  get activeLayer() {
    return this.layers.find((l) => l.id === this.activeId) || null;
  }

  updateLayer(id, updates) {
    const layer = this.layers.find((l) => l.id === id);
    if (!layer) return;
    Object.assign(layer, updates);
    this.notify();
  }

  removeLayer(id) {
    this.layers = this.layers.filter((l) => l.id !== id);
    if (this.activeId === id) this.activeId = this.layers[0]?.id || null;
    this.notify();
  }

  moveLayer(id, direction) {
    const index = this.layers.findIndex((l) => l.id === id);
    if (index === -1) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= this.layers.length) return;
    const [layer] = this.layers.splice(index, 1);
    this.layers.splice(targetIndex, 0, layer);
    this.notify();
  }

  toggleVisibility(id) {
    const layer = this.layers.find((l) => l.id === id);
    if (!layer) return;
    layer.visible = !layer.visible;
    this.notify();
  }

  toggleLock(id) {
    const layer = this.layers.find((l) => l.id === id);
    if (!layer) return;
    layer.locked = !layer.locked;
    this.notify();
  }

  serialize() {
    return {
      activeId: this.activeId,
      layers: this.layers,
    };
  }

  load(data) {
    this.layers = data.layers || [];
    this._id = this.layers.reduce((max, l) => Math.max(max, l.id), 0);
    this.activeId = data.activeId || this.layers[0]?.id || null;
    this.notify();
  }
}

export function defaultFilters() {
  return {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0,
    sharpen: 0,
    invert: 0,
    grayscale: 0,
    sepia: 0,
    vignette: 0,
    depth: 0,
    texture: 0,
    inkWeight: 0,
    scratchiness: 0,
    shadow: 0,
    glow: 0,
    noise: 0,
  };
}

export function defaultTransforms() {
  return {
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    translateX: 0,
    translateY: 0,
  };
}
