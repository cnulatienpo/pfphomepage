import { buildFilterString, applySpecialFilters, applySharpen } from './filters.js';
import { applyTransforms } from './transforms.js';

export class CanvasEngine {
  constructor(canvas, overlay, layerManager) {
    this.canvas = canvas;
    this.overlay = overlay;
    this.ctx = canvas.getContext('2d');
    this.layerManager = layerManager;
    this.zoom = 1;
    this.gridEnabled = true;
    this.dirty = true;
    this.dragging = false;
    this.imageCache = new Map();
    this.selectionBox = document.createElement('div');
    this.selectionBox.className = 'selection-box';
    canvas.parentElement.appendChild(this.selectionBox);

    this.attachEvents();
    requestAnimationFrame(() => this.render());
  }

  attachEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
    window.addEventListener('mousemove', (e) => this.onPointerMove(e));
    window.addEventListener('mouseup', () => this.onPointerUp());
    this.canvas.addEventListener('dragover', (e) => e.preventDefault());
  }

  setZoom(delta) {
    this.zoom = Math.min(4, Math.max(0.25, this.zoom + delta));
    document.getElementById('zoom-level').textContent = `${Math.round(this.zoom * 100)}%`;
    this.dirty = true;
  }

  toggleGrid() {
    this.gridEnabled = !this.gridEnabled;
    this.overlay.classList.toggle('hidden', !this.gridEnabled);
    this.dirty = true;
  }

  async render() {
    if (this.dirty) {
      this.ctx.save();
      this.ctx.setTransform(this.zoom, 0, 0, this.zoom, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const ordered = [...this.layerManager.layers].reverse();
      for (const layer of ordered) {
        if (!layer.visible) continue;
        await this.drawLayer(layer);
      }
      this.ctx.restore();
      this.updateSelectionBox();
      this.dirty = false;
    }
    requestAnimationFrame(() => this.render());
  }

  async drawLayer(layer) {
    this.ctx.save();
    applyTransforms(this.ctx, layer);
    this.ctx.globalAlpha = layer.opacity;
    this.ctx.globalCompositeOperation = layer.blendMode;
    this.ctx.filter = buildFilterString(layer.filter);

    if (layer.type === 'image') {
      const img = await this.loadImage(layer.src);
      if (img) {
        this.ctx.drawImage(img, 0, 0, layer.width, layer.height);
        applySharpen(this.ctx, layer);
        applySpecialFilters(this.ctx, layer, layer.width, layer.height);
      }
    } else if (layer.type === 'text') {
      this.ctx.fillStyle = '#e2e8f0';
      this.ctx.font = 'bold 26px Inter, sans-serif';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(layer.content || 'Text', 0, 0, layer.width || 480);
    } else if (layer.type === 'component') {
      this.ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 2;
      this.ctx.fillRect(0, 0, layer.width, layer.height);
      this.ctx.strokeRect(0, 0, layer.width, layer.height);
      this.ctx.fillStyle = '#f8fafc';
      this.ctx.font = '14px Inter, sans-serif';
      this.ctx.fillText(layer.name, 8, 8);
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.font = '12px Inter, sans-serif';
      this.ctx.fillText(layer.classes.join(' '), 8, 26);
    }

    this.ctx.restore();
  }

  async loadImage(src) {
    if (!src) return null;
    if (this.imageCache.has(src)) return this.imageCache.get(src);
    const img = new Image();
    img.src = src;
    const promise = new Promise((resolve) => {
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
    this.imageCache.set(src, promise);
    return promise;
  }

  getPointerPosition(evt) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left) / this.zoom;
    const y = (evt.clientY - rect.top) / this.zoom;
    return { x, y };
  }

  findLayerAtPoint(x, y) {
    for (const layer of this.layerManager.layers) {
      if (!layer.visible) continue;
      const width = layer.width * (layer.transform.flipX ? -layer.transform.scaleX : layer.transform.scaleX);
      const height = layer.height * (layer.transform.flipY ? -layer.transform.scaleY : layer.transform.scaleY);
      const hit = x >= layer.x && x <= layer.x + Math.abs(width) && y >= layer.y && y <= layer.y + Math.abs(height);
      if (hit) return layer;
    }
    return null;
  }

  onPointerDown(evt) {
    const { x, y } = this.getPointerPosition(evt);
    const target = this.findLayerAtPoint(x, y);
    if (target && !target.locked) {
      this.layerManager.setActive(target.id);
      this.dragging = {
        id: target.id,
        offsetX: x - target.x,
        offsetY: y - target.y,
      };
    } else {
      this.layerManager.setActive(null);
    }
    this.dirty = true;
  }

  onPointerMove(evt) {
    if (!this.dragging) return;
    const layer = this.layerManager.layers.find((l) => l.id === this.dragging.id);
    if (!layer) return;
    const { x, y } = this.getPointerPosition(evt);
    this.layerManager.updateLayer(layer.id, { x: x - this.dragging.offsetX, y: y - this.dragging.offsetY });
    this.dirty = true;
  }

  onPointerUp() {
    this.dragging = false;
  }

  updateSelectionBox() {
    const layer = this.layerManager.activeLayer;
    if (!layer || !layer.visible) {
      this.selectionBox.style.display = 'none';
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const x = (layer.x * this.zoom) + rect.left;
    const y = (layer.y * this.zoom) + rect.top;
    const w = Math.abs(layer.width * layer.transform.scaleX * this.zoom);
    const h = Math.abs(layer.height * layer.transform.scaleY * this.zoom);
    this.selectionBox.style.display = 'block';
    this.selectionBox.style.left = `${x}px`;
    this.selectionBox.style.top = `${y}px`;
    this.selectionBox.style.width = `${w}px`;
    this.selectionBox.style.height = `${h}px`;
  }
}
