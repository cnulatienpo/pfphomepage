import { applyFilters } from './filters.js';

export class CanvasEngine {
  constructor(canvas, overlay, layerManager) {
    this.canvas = canvas;
    this.overlay = overlay;
    this.ctx = canvas.getContext('2d');
    this.layerManager = layerManager;
    this.zoom = 1;
    this.dirty = true;
    this.showGrid = true;
    this._startLoop();
  }

  _startLoop() {
    const tick = () => {
      if (this.dirty) {
        this.draw();
        this.dirty = false;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  draw() {
    const { ctx, canvas } = this;
    ctx.save();
    ctx.setTransform(this.zoom, 0, 0, this.zoom, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0b2144';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.layerManager.layers.forEach((layer) => {
      if (!layer.visible) return;
      ctx.save();
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.globalAlpha = layer.filter.opacity / 100;
      applyFilters(ctx, layer.filter);
      ctx.translate(layer.x + layer.transform.x, layer.y + layer.transform.y);
      ctx.rotate((layer.transform.rotation * Math.PI) / 180);
      ctx.scale(layer.transform.scale, layer.transform.scale);
      this._drawPlaceholder(ctx, layer);
      ctx.restore();
    });

    if (this.showGrid) {
      this._drawGrid();
    }

    ctx.restore();
  }

  _drawPlaceholder(ctx, layer) {
    const background = layer.backgroundColor || '#ffce00';
    const border = layer.borderColor || '#123055';
    const textColor = layer.textColor || '#0f172a';
    ctx.fillStyle = background;
    ctx.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
    ctx.strokeStyle = border;
    ctx.lineWidth = 6;
    ctx.strokeRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let x = -layer.width / 2 + 10; x < layer.width / 2; x += 22) {
      ctx.fillRect(x, -layer.height / 2, 6, layer.height);
    }
    ctx.fillStyle = textColor;
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(layer.name.toUpperCase(), 0, 0);
    if (layer.sticker) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(layer.width / 2 - 18, -layer.height / 2 + 18, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(layer.sticker.slice(0, 2).toUpperCase(), layer.width / 2 - 18, -layer.height / 2 + 18);
    }
  }

  _drawGrid() {
    const { canvas, ctx } = this;
    const size = 48 * this.zoom;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += size) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  toggleGrid(force) {
    this.showGrid = typeof force === 'boolean' ? force : !this.showGrid;
    this.dirty = true;
  }

  setZoom(delta) {
    this.zoom = Math.max(0.25, Math.min(3, this.zoom + delta));
    document.getElementById('zoom-level').textContent = `${Math.round(this.zoom * 100)}%`;
    this.dirty = true;
  }
}
