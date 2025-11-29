import { uid } from './utils.js';

export function defaultFilters() {
  return {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0,
    opacity: 100,
  };
}

export function defaultTransforms() {
  return {
    rotation: 0,
    scale: 1,
    x: 0,
    y: 0,
  };
}

export class LayerManager {
  constructor() {
    this.layers = [];
    this.activeId = null;
    this.subscribers = [];
  }

  subscribe(fn) {
    this.subscribers.push(fn);
  }

  notify() {
    this.subscribers.forEach((fn) => fn(this.layers));
  }

  createLayer(partial) {
    const layer = {
      id: uid(),
      name: partial.name || 'Layer',
      src: partial.src,
      x: partial.x ?? 120,
      y: partial.y ?? 120,
      width: partial.width ?? 240,
      height: partial.height ?? 240,
      blendMode: partial.blendMode || 'source-over',
      visible: partial.visible ?? true,
      locked: partial.locked ?? false,
      filter: partial.filter || defaultFilters(),
      transform: partial.transform || defaultTransforms(),
      placeholder: partial.placeholder ?? true,
      sticker: partial.sticker || null,
      classes: partial.classes || [],
      markup: partial.markup || null,
    };
    this.layers.push(layer);
    this.activeId = layer.id;
    this.notify();
    return layer;
  }

  updateLayer(id, data) {
    const target = this.layers.find((l) => l.id === id);
    if (!target) return;
    Object.assign(target, data);
    this.notify();
  }

  toggleVisibility(id) {
    const target = this.layers.find((l) => l.id === id);
    if (!target) return;
    target.visible = !target.visible;
    this.notify();
  }

  toggleLock(id) {
    const target = this.layers.find((l) => l.id === id);
    if (!target) return;
    target.locked = !target.locked;
    this.notify();
  }

  moveLayer(id, direction) {
    const index = this.layers.findIndex((l) => l.id === id);
    if (index < 0) return;
    const newIndex = Math.min(this.layers.length - 1, Math.max(0, index + direction));
    const [layer] = this.layers.splice(index, 1);
    this.layers.splice(newIndex, 0, layer);
    this.notify();
  }

  setActive(id) {
    this.activeId = id;
    this.notify();
  }

  removeLayer(id) {
    this.layers = this.layers.filter((l) => l.id !== id);
    if (this.activeId === id) {
      this.activeId = this.layers[0]?.id || null;
    }
    this.notify();
  }

  serialize() {
    return { layers: this.layers, activeId: this.activeId };
  }

  load(data) {
    this.layers = data.layers || [];
    this.activeId = data.activeId || null;
    this.notify();
  }
}
