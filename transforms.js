// Fisher-Price style transform controls for arbitrary DOM layers.
// Usage: const controls = new TransformControls(targetElement, options)
// Emits "transformChanged" CustomEvent from the target with the updated state.

const FP_HANDLE_SVGS = {
  main: `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fpRainbow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff99cc" />
          <stop offset="40%" stop-color="#ffdd55" />
          <stop offset="80%" stop-color="#6ee7ff" />
          <stop offset="100%" stop-color="#a78bfa" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#fpRainbow)" stroke="#111" stroke-width="3" />
      <circle cx="32" cy="32" r="12" fill="#fff" stroke="#111" stroke-width="3" />
    </svg>
  `,
  warp: `
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect x="5" y="10" width="38" height="28" rx="8" fill="#fff" stroke="#0f172a" stroke-width="3" />
      <path d="M5 10 L12 5 L36 5 L43 10" fill="none" stroke="#fb7185" stroke-width="3" />
      <path d="M5 38 L12 43 L36 43 L43 38" fill="none" stroke="#22c55e" stroke-width="3" />
      <circle cx="24" cy="24" r="6" fill="#fef3c7" stroke="#0f172a" stroke-width="3" />
    </svg>
  `,
  rotate: `
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="18" fill="#e0f2fe" stroke="#0ea5e9" stroke-width="4" />
      <path d="M24 6 A18 18 0 0 1 42 24" fill="none" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round" />
      <polygon points="36,10 44,8 42,16" fill="#0ea5e9" />
    </svg>
  `,
  skew: `
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect x="10" y="10" width="28" height="20" fill="#fff7ed" stroke="#fb923c" stroke-width="4" transform="skewX(-12)" />
      <path d="M6 14 H42" stroke="#fb923c" stroke-width="4" stroke-linecap="round" />
      <path d="M6 30 H42" stroke="#fb923c" stroke-width="4" stroke-linecap="round" />
    </svg>
  `,
  flip: `
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M12 8 L36 24 L12 40 Z" fill="#c7d2fe" stroke="#4338ca" stroke-width="4" />
      <path d="M12 8 V40" stroke="#111827" stroke-width="3" stroke-linecap="round" />
    </svg>
  `,
  slider: `
    <svg viewBox="0 0 64 24" aria-hidden="true" focusable="false">
      <rect x="4" y="10" width="56" height="4" rx="2" fill="#e2e8f0" />
      <circle cx="32" cy="12" r="8" fill="#a7f3d0" stroke="#10b981" stroke-width="3" />
    </svg>
  `
}

const FP_STYLE_ID = 'fp-transform-style';

function ensureStyles () {
  if (document.getElementById(FP_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = FP_STYLE_ID;
  style.textContent = `
    .fp-transform-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
      box-sizing: border-box;
      border: 2px dashed rgba(17, 24, 39, 0.35);
      border-radius: 14px;
    }
    .fp-transform-overlay [data-fp-handle] {
      position: absolute;
      width: 44px;
      height: 44px;
      transform: translate(-50%, -50%);
      pointer-events: all;
      cursor: grab;
      border-radius: 14px;
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.7));
      box-shadow: 0 8px 24px rgba(0,0,0,0.16);
      display: grid;
      place-items: center;
      user-select: none;
    }
    .fp-transform-overlay [data-fp-handle]:active {
      cursor: grabbing;
      box-shadow: 0 4px 12px rgba(0,0,0,0.18) inset, 0 8px 18px rgba(0,0,0,0.16);
    }
    .fp-transform-overlay [data-fp-handle] svg {
      width: 70%;
      height: 70%;
      pointer-events: none;
    }
    .fp-transform-toolbar {
      position: absolute;
      left: 50%;
      bottom: -64px;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 10px 12px;
      border-radius: 16px;
      background: rgba(255,255,255,0.9);
      box-shadow: 0 10px 30px rgba(0,0,0,0.18);
      pointer-events: all;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .fp-chip {
      border: none;
      background: linear-gradient(135deg, #f472b6, #60a5fa);
      color: #0b1021;
      font-weight: 700;
      padding: 6px 10px;
      border-radius: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 6px 12px rgba(0,0,0,0.14);
    }
    .fp-chip svg { width: 20px; height: 20px; }
    .fp-range {
      display: grid;
      gap: 4px;
      color: #0f172a;
      font-size: 12px;
    }
    .fp-range input[type=range] {
      accent-color: #22c55e;
      width: 160px;
    }
  `;
  document.head.appendChild(style);
}

function createHandle (role, svg) {
  const el = document.createElement('div');
  el.dataset.fpHandle = role;
  el.innerHTML = svg;
  return el;
}

function clamp (val, min, max) {
  return Math.max(min, Math.min(max, val));
}

class TransformControls {
  constructor (target, options = {}) {
    if (!target) throw new Error('TransformControls needs a target element');
    ensureStyles();
    this.target = target;
    this.options = options;
    this.state = {
      rotate: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
      perspective: 800,
      depth: 0.35,
      originX: 50,
      originY: 50
    };
    this.isDragging = false;
    this.activeHandle = null;
    this.startPointer = null;
    this.startState = null;

    this._setup();
    this.updateFromComputed();
    this.updateOverlay();
    this.apply();
  }

  updateFromComputed () {
    const cs = window.getComputedStyle(this.target);
    const origin = cs.transformOrigin.split(' ');
    if (origin.length >= 2) {
      const ox = parseFloat(origin[0]);
      const oy = parseFloat(origin[1]);
      if (!Number.isNaN(ox) && !Number.isNaN(oy)) {
        this.state.originX = (ox / this.target.offsetWidth) * 100;
        this.state.originY = (oy / this.target.offsetHeight) * 100;
      }
    }
  }

  _setup () {
    if (window.getComputedStyle(this.target).position === 'static') {
      this.target.style.position = 'relative';
    }

    this.overlay = document.createElement('div');
    this.overlay.className = 'fp-transform-overlay';
    this.overlay.setAttribute('aria-hidden', 'true');
    this.overlay.style.pointerEvents = 'none';

    const handles = [
      { role: 'scale-tl', pos: ['0%', '0%'], svg: FP_HANDLE_SVGS.main },
      { role: 'scale-tr', pos: ['100%', '0%'], svg: FP_HANDLE_SVGS.main },
      { role: 'scale-bl', pos: ['0%', '100%'], svg: FP_HANDLE_SVGS.main },
      { role: 'scale-br', pos: ['100%', '100%'], svg: FP_HANDLE_SVGS.main },
      { role: 'rotate', pos: ['50%', '-16%'], svg: FP_HANDLE_SVGS.rotate },
      { role: 'skew-x', pos: ['50%', '100%'], svg: FP_HANDLE_SVGS.skew },
      { role: 'skew-y', pos: ['0%', '50%'], svg: FP_HANDLE_SVGS.skew },
      { role: 'warp-tl', pos: ['12%', '12%'], svg: FP_HANDLE_SVGS.warp },
      { role: 'warp-tr', pos: ['88%', '12%'], svg: FP_HANDLE_SVGS.warp },
      { role: 'warp-bl', pos: ['12%', '88%'], svg: FP_HANDLE_SVGS.warp },
      { role: 'warp-br', pos: ['88%', '88%'], svg: FP_HANDLE_SVGS.warp }
    ];

    handles.forEach(item => {
      const handle = createHandle(item.role, item.svg);
      handle.style.left = item.pos[0];
      handle.style.top = item.pos[1];
      handle.addEventListener('pointerdown', e => this.onPointerDown(e, item.role));
      this.overlay.appendChild(handle);
    });

    this.toolbar = this.createToolbar();
    this.target.appendChild(this.overlay);
    this.target.appendChild(this.toolbar);
  }

  createToolbar () {
    const bar = document.createElement('div');
    bar.className = 'fp-transform-toolbar';

    const flipX = document.createElement('button');
    flipX.className = 'fp-chip';
    flipX.innerHTML = `${FP_HANDLE_SVGS.flip}<span>flip X</span>`;
    flipX.addEventListener('click', () => {
      this.state.scaleX *= -1;
      this.apply();
    });

    const flipY = document.createElement('button');
    flipY.className = 'fp-chip';
    flipY.innerHTML = `${FP_HANDLE_SVGS.flip}<span>flip Y</span>`;
    flipY.style.background = 'linear-gradient(135deg, #22d3ee, #a855f7)';
    flipY.addEventListener('click', () => {
      this.state.scaleY *= -1;
      this.apply();
    });

    const perspectiveWrap = document.createElement('label');
    perspectiveWrap.className = 'fp-range';
    perspectiveWrap.innerHTML = `<span>perspective</span>`;
    const perspectiveSlider = document.createElement('input');
    perspectiveSlider.type = 'range';
    perspectiveSlider.min = '200';
    perspectiveSlider.max = '1500';
    perspectiveSlider.value = String(this.state.perspective);
    perspectiveSlider.addEventListener('input', () => {
      this.state.perspective = Number(perspectiveSlider.value);
      this.apply();
    });
    perspectiveWrap.appendChild(perspectiveSlider);

    const depthWrap = document.createElement('label');
    depthWrap.className = 'fp-range';
    depthWrap.innerHTML = `<span>depth</span>`;
    const depthSlider = document.createElement('input');
    depthSlider.type = 'range';
    depthSlider.min = '0';
    depthSlider.max = '1';
    depthSlider.step = '0.01';
    depthSlider.value = String(this.state.depth);
    depthSlider.addEventListener('input', () => {
      this.state.depth = Number(depthSlider.value);
      this.apply();
    });
    depthWrap.appendChild(depthSlider);

    [flipX, flipY, perspectiveWrap, depthWrap].forEach(el => bar.appendChild(el));
    return bar;
  }

  onPointerDown (event, role) {
    event.preventDefault();
    this.isDragging = true;
    this.activeHandle = role;
    this.startPointer = { x: event.clientX, y: event.clientY };
    this.startState = { ...this.state };
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  onPointerMove = (event) => {
    if (!this.isDragging || !this.activeHandle) return;
    const dx = event.clientX - this.startPointer.x;
    const dy = event.clientY - this.startPointer.y;
    const rect = this.target.getBoundingClientRect();

    switch (this.activeHandle) {
      case 'rotate': {
        const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const angle = Math.atan2(event.clientY - center.y, event.clientX - center.x);
        this.state.rotate = (angle * 180) / Math.PI + 90;
        break;
      }
      case 'scale-tl':
      case 'scale-tr':
      case 'scale-bl':
      case 'scale-br': {
        const delta = (Math.abs(dx) + Math.abs(dy)) / 200;
        const direction = (this.activeHandle === 'scale-tl' || this.activeHandle === 'scale-bl') ? -1 : 1;
        this.state.scale = clamp(this.startState.scale + delta * direction, 0.2, 4);
        break;
      }
      case 'skew-x': {
        this.state.skewX = clamp(this.startState.skewX + dx / 4, -45, 45);
        break;
      }
      case 'skew-y': {
        this.state.skewY = clamp(this.startState.skewY + dy / 4, -45, 45);
        break;
      }
      case 'warp-tl':
      case 'warp-tr':
      case 'warp-bl':
      case 'warp-br': {
        const percentX = clamp((dx / rect.width) * 100 + this.startState.originX, 0, 100);
        const percentY = clamp((dy / rect.height) * 100 + this.startState.originY, 0, 100);
        this.state.originX = percentX;
        this.state.originY = percentY;
        this.state.skewX = clamp(this.state.skewX + dx / 12, -60, 60);
        this.state.skewY = clamp(this.state.skewY + dy / 12, -60, 60);
        this.state.perspective = clamp(this.state.perspective - dy, 200, 1500);
        break;
      }
      case 'scale-t':
      default:
        break;
    }

    this.apply();
  }

  onPointerUp = () => {
    this.isDragging = false;
    this.activeHandle = null;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  }

  apply () {
    const combinedScaleX = this.state.scale * this.state.scaleX;
    const combinedScaleY = this.state.scale * this.state.scaleY;
    const transform = [
      `perspective(${this.state.perspective}px)`,
      `rotate(${this.state.rotate}deg)`,
      `skew(${this.state.skewX}deg, ${this.state.skewY}deg)`,
      `scale(${combinedScaleX}, ${combinedScaleY})`
    ].join(' ');

    this.target.style.transformOrigin = `${this.state.originX}% ${this.state.originY}%`;
    this.target.style.transform = transform;

    const depth = this.state.depth;
    const shadow = `${depth * 8}px ${depth * 12}px ${Math.max(6, depth * 24)}px rgba(15, 23, 42, ${0.28 + depth * 0.25})`;
    this.target.style.filter = `drop-shadow(${shadow})`;
    this.target.style.boxShadow = `inset 0 ${depth * 4}px ${depth * 8}px rgba(255,255,255,0.6), 0 ${depth * 8}px ${Math.max(10, depth * 24)}px rgba(15,23,42,0.2)`;

    this.dispatchChange();
  }

  dispatchChange () {
    const detail = { ...this.state, transform: this.target.style.transform, origin: this.target.style.transformOrigin };
    const evt = new CustomEvent('transformChanged', { detail });
    this.target.dispatchEvent(evt);
  }

  updateOverlay () {
    const rect = this.target.getBoundingClientRect();
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;
  }

  destroy () {
    this.overlay?.remove();
    this.toolbar?.remove();
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  }
}

export { TransformControls };
export default TransformControls;
