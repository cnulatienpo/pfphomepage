/*
 * CanvasEngine: Multi-layer editor built with absolutely positioned div elements.
 * Features: drag, scale, rotate, skew, warp (per-corner), snap guides, zoom/pan.
 */

const DEFAULT_LAYER_SIZE = { width: 320, height: 240 };

/** Simple event emitter without dependencies */
class MiniEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, cb) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(cb);
    return () => this.off(event, cb);
  }

  off(event, cb) {
    if (this.listeners.has(event)) this.listeners.get(event).delete(cb);
  }

  emit(event, payload) {
    if (!this.listeners.has(event)) return;
    for (const cb of this.listeners.get(event)) {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[CanvasEngine] listener error for ${event}:`, err);
      }
    }
  }
}

/**
 * Utility: compute homography matrix (3x3) that maps source quad to destination quad.
 * Returns flat array of 9 numbers.
 */
function computeHomography(src, dst) {
  // Solve linear system using determinant method.
  const matrix = [];
  for (let i = 0; i < 4; i++) {
    const { x: X, y: Y } = src[i];
    const { x: x, y: y } = dst[i];
    matrix.push(
      [X, Y, 1, 0, 0, 0, -x * X, -x * Y, x],
      [0, 0, 0, X, Y, 1, -y * X, -y * Y, y]
    );
  }

  // Gaussian elimination
  for (let row = 0; row < 8; row++) {
    // pivot
    let maxRow = row;
    for (let r = row + 1; r < 8; r++) {
      if (Math.abs(matrix[r][row]) > Math.abs(matrix[maxRow][row])) {
        maxRow = r;
      }
    }
    [matrix[row], matrix[maxRow]] = [matrix[maxRow], matrix[row]];
    const pivot = matrix[row][row] || 1e-9;
    for (let col = row; col < 9; col++) matrix[row][col] /= pivot;
    for (let r = 0; r < 8; r++) {
      if (r === row) continue;
      const factor = matrix[r][row];
      for (let c = row; c < 9; c++) matrix[r][c] -= factor * matrix[row][c];
    }
  }
  // Last value is 1 by definition of homography scale.
  const h = matrix.map((r) => r[8]);
  h.push(1);
  return h;
}

function homographyToCssMatrix3d(h) {
  // h = [h11, h12, h13, h21, h22, h23, h31, h32, h33]
  return `matrix3d(${[
    h[0], h[1], 0, h[2],
    h[3], h[4], 0, h[5],
    0,    0,    1, 0,
    h[6], h[7], 0, h[8]
  ].join(',')})`;
}

function createStyles() {
  if (document.getElementById('canvas-engine-styles')) return;
  const style = document.createElement('style');
  style.id = 'canvas-engine-styles';
  style.textContent = `
    .canvas-engine-wrapper { position: relative; width: 100%; height: 100%; overflow: hidden; touch-action: none; background: #0d1117; }
    .canvas-engine-stage { position: absolute; inset: 0; transform-origin: 0 0; }
    .canvas-engine-layer { position: absolute; top: 0; left: 0; transform-origin: 0 0; border: 1px dashed rgba(255,255,255,0.35); background: repeating-linear-gradient(45deg, rgba(255,255,255,0.05), rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px); color: #fff; font-family: system-ui, sans-serif; user-select: none; }
    .canvas-engine-layer .layer-label { position: absolute; bottom: 4px; right: 8px; font-size: 12px; opacity: 0.7; }
    .canvas-engine-layer.selected { border-color: #58a6ff; box-shadow: 0 0 0 1px #58a6ff; }
    .canvas-engine-handles { position: absolute; inset: 0; pointer-events: none; }
    .canvas-engine-handle { position: absolute; width: 12px; height: 12px; border-radius: 50%; border: 1px solid #0d1117; background: #58a6ff; transform: translate(-50%, -50%); pointer-events: auto; cursor: pointer; }
    .canvas-engine-handle[data-handle="move"] { cursor: move; opacity: 0.6; background: #f2cc60; }
    .canvas-engine-handle[data-handle^="warp"] { background: #ffa657; }
    .canvas-engine-guides { position: absolute; inset: 0; pointer-events: none; }
  `;
  document.head.appendChild(style);
}

function createHandle(name) {
  const h = document.createElement('div');
  h.className = 'canvas-engine-handle';
  h.dataset.handle = name;
  return h;
}

function defaultWarp() {
  return {
    topLeft: { x: 0, y: 0 },
    topRight: { x: 0, y: 0 },
    bottomRight: { x: 0, y: 0 },
    bottomLeft: { x: 0, y: 0 }
  };
}

class CanvasEngine {
  constructor(container, { snapEngine = null } = {}) {
    this.container = container;
    this.snapEngine = snapEngine;
    this.emitter = new MiniEmitter();
    this.layers = new Map();
    this.selectedLayerId = null;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.needsRender = false;
    this.activePointer = null;
    this.pointerMode = null;
    this.handleTarget = null;
    this.lastPointer = { x: 0, y: 0 };
    this.guides = [];

    createStyles();
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'canvas-engine-wrapper';
    this.stage = document.createElement('div');
    this.stage.className = 'canvas-engine-stage';
    this.guidesLayer = document.createElement('div');
    this.guidesLayer.className = 'canvas-engine-guides';

    this.wrapper.appendChild(this.stage);
    this.wrapper.appendChild(this.guidesLayer);
    this.container.appendChild(this.wrapper);

    this.wrapper.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));

    this.renderLoop = this.renderLoop.bind(this);
    requestAnimationFrame(this.renderLoop);
  }

  on(event, cb) { return this.emitter.on(event, cb); }

  addLayer({ id, width = DEFAULT_LAYER_SIZE.width, height = DEFAULT_LAYER_SIZE.height, content = null, x = 0, y = 0 }) {
    if (this.layers.has(id)) throw new Error(`Layer ${id} already exists`);
    const el = document.createElement('div');
    el.className = 'canvas-engine-layer';
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.dataset.layerId = id;

    const label = document.createElement('div');
    label.className = 'layer-label';
    label.textContent = id;
    el.appendChild(label);

    const handles = document.createElement('div');
    handles.className = 'canvas-engine-handles';
    const warpHandles = ['warp-tl','warp-tr','warp-br','warp-bl'];
    const moveHandle = createHandle('move');
    moveHandle.style.left = '50%';
    moveHandle.style.top = '50%';
    handles.appendChild(moveHandle);
    warpHandles.forEach((name) => {
      const h = createHandle(name);
      switch (name) {
        case 'warp-tl': h.style.left = '0%'; h.style.top = '0%'; break;
        case 'warp-tr': h.style.left = '100%'; h.style.top = '0%'; break;
        case 'warp-br': h.style.left = '100%'; h.style.top = '100%'; break;
        case 'warp-bl': h.style.left = '0%'; h.style.top = '100%'; break;
      }
      handles.appendChild(h);
    });
    el.appendChild(handles);

    if (content) el.appendChild(content);

    this.stage.appendChild(el);
    const state = {
      id,
      el,
      width,
      height,
      x,
      y,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      skewX: 0,
      skewY: 0,
      warp: defaultWarp(),
      dragging: false
    };
    this.layers.set(id, state);
    this.selectLayer(id);
    this.requestRender();
    return state;
  }

  selectLayer(id) {
    if (this.selectedLayerId && this.layers.has(this.selectedLayerId)) {
      this.layers.get(this.selectedLayerId).el.classList.remove('selected');
    }
    this.selectedLayerId = id;
    const layer = this.layers.get(id);
    if (layer) {
      layer.el.classList.add('selected');
      this.emitter.emit('layerSelected', { id });
    }
  }

  moveLayer(id, dx, dy) {
    const layer = this.layers.get(id);
    if (!layer) return;
    let newX = layer.x + dx;
    let newY = layer.y + dy;
    if (this.snapEngine?.snapPosition) {
      const snapResult = this.snapEngine.snapPosition({ x: newX, y: newY, width: layer.width, height: layer.height });
      if (snapResult) {
        newX = snapResult.x ?? newX;
        newY = snapResult.y ?? newY;
        if (snapResult.guides) this.setGuides(snapResult.guides);
      }
    }
    layer.x = newX;
    layer.y = newY;
    this.emitter.emit('layerMoved', { id, x: newX, y: newY });
    this.requestRender();
  }

  transformLayer(id, partial) {
    const layer = this.layers.get(id);
    if (!layer) return;
    Object.assign(layer, partial);
    this.emitter.emit('layerTransformed', { id, ...partial });
    this.requestRender();
  }

  warpLayer(id, warp) {
    const layer = this.layers.get(id);
    if (!layer) return;
    layer.warp = { ...layer.warp, ...warp };
    this.emitter.emit('layerTransformed', { id, warp: layer.warp });
    this.requestRender();
  }

  setZoom(zoom) {
    this.zoom = zoom;
    this.requestRender();
    this.emitter.emit('canvasZoom', { zoom });
  }

  setPan(x, y) {
    this.pan = { x, y };
    this.requestRender();
    this.emitter.emit('canvasPan', { x, y });
  }

  setGuides(guides = []) {
    this.guides = guides;
    this.requestRender();
  }

  clearGuides() {
    this.guides = [];
    this.guidesLayer.innerHTML = '';
  }

  requestRender() {
    this.needsRender = true;
  }

  getBaseCorners(layer) {
    return [
      { x: 0, y: 0 },
      { x: layer.width, y: 0 },
      { x: layer.width, y: layer.height },
      { x: 0, y: layer.height }
    ];
  }

  applyTransforms(layer) {
    const corners = this.getBaseCorners(layer);
    const warp = layer.warp || defaultWarp();
    const toPoints = corners.map((p, idx) => {
      const key = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'][idx];
      const warpOffset = warp[key] || { x: 0, y: 0 };
      let x = p.x + warpOffset.x;
      let y = p.y + warpOffset.y;

      // scale
      x *= layer.scaleX;
      y *= layer.scaleY;

      // skew
      const skewXRad = (layer.skewX * Math.PI) / 180;
      const skewYRad = (layer.skewY * Math.PI) / 180;
      x = x + Math.tan(skewXRad) * y;
      y = y + Math.tan(skewYRad) * x;

      // rotate
      const rad = (layer.rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;

      // translate
      return { x: rx + layer.x, y: ry + layer.y };
    });

    const h = computeHomography(corners, toPoints);
    const transform = homographyToCssMatrix3d(h);
    layer.el.style.transform = transform;
    layer.el.style.width = `${layer.width}px`;
    layer.el.style.height = `${layer.height}px`;
  }

  renderGuides() {
    if (!this.guides?.length) {
      this.guidesLayer.innerHTML = '';
      return;
    }
    const lines = this.guides.map((g, idx) => {
      const { x1, y1, x2, y2, color = 'rgba(88,166,255,0.8)', dash = '4 4' } = g;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1" stroke-dasharray="${dash}" />`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${this.wrapper.clientWidth} ${this.wrapper.clientHeight}" style="position:absolute;inset:0;">
      ${lines}
    </svg>`;
    this.guidesLayer.innerHTML = svg;
  }

  renderLoop() {
    if (this.needsRender) {
      this.stage.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
      for (const layer of this.layers.values()) {
        this.applyTransforms(layer);
      }
      this.renderGuides();
      this.needsRender = false;
    }
    requestAnimationFrame(this.renderLoop);
  }

  onPointerDown(e) {
    const targetLayer = e.target.closest?.('.canvas-engine-layer');
    if (!targetLayer) return;
    const id = targetLayer.dataset.layerId;
    if (!this.layers.has(id)) return;
    this.selectLayer(id);
    const handle = e.target.closest?.('.canvas-engine-handle');
    this.activePointer = e.pointerId;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    if (handle) {
      this.pointerMode = handle.dataset.handle;
      this.handleTarget = handle;
    } else {
      this.pointerMode = 'move-layer';
    }
    e.target.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  onPointerMove(e) {
    if (this.activePointer !== e.pointerId) return;
    const layer = this.layers.get(this.selectedLayerId);
    if (!layer) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    if (this.pointerMode === 'move-layer' || this.pointerMode === 'move') {
      this.moveLayer(layer.id, dx / this.zoom, dy / this.zoom);
    } else if (this.pointerMode?.startsWith('warp')) {
      const cornerKey = {
        'warp-tl': 'topLeft',
        'warp-tr': 'topRight',
        'warp-br': 'bottomRight',
        'warp-bl': 'bottomLeft'
      }[this.pointerMode];
      if (cornerKey) {
        const warp = { ...layer.warp };
        warp[cornerKey] = {
          x: warp[cornerKey].x + dx / this.zoom,
          y: warp[cornerKey].y + dy / this.zoom
        };
        this.warpLayer(layer.id, warp);
      }
    }
    this.lastPointer = { x: e.clientX, y: e.clientY };
  }

  onPointerUp(e) {
    if (this.activePointer !== e.pointerId) return;
    this.activePointer = null;
    this.pointerMode = null;
    this.handleTarget = null;
    this.clearGuides();
  }
}

export { CanvasEngine };
export default CanvasEngine;
