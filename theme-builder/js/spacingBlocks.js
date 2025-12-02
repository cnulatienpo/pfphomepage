const PEG_COLORS = {
  margin: { bg: 'linear-gradient(180deg, #ffe3b0, #ffce00)', border: '#e0a800' },
  padding: { bg: 'linear-gradient(180deg, #b6d9ff, #4ade80)', border: '#2b7de9' },
};

export function renderSpacingPreview(container) {
  ensureStyles();
  container.innerHTML = '';
  container.classList.add('spacing-lab');

  const state = {
    step: 8,
    margin: { top: 24, right: 24, bottom: 24, left: 24 },
    padding: { top: 16, right: 20, bottom: 16, left: 20 },
  };

  const toolbar = buildToolbar(state, () => updateSpacing());
  const stage = buildStage();
  const summary = document.createElement('div');
  summary.className = 'spacing-readout';

  const handles = createHandles(stage, state, () => {
    updateSpacing();
  });

  stage.append(...handles);
  container.append(toolbar, stage, summary);

  updateSpacing();

  function updateSpacing() {
    applyVariables(stage, state);
    syncHandleValues(handles, state);
    positionHandles(stage, handles);
    summary.innerHTML = renderSummary(state);
  }
}

function buildToolbar(state, onChange) {
  const toolbar = document.createElement('div');
  toolbar.className = 'spacing-toolbar';

  const title = document.createElement('div');
  title.className = 'spacing-title';
  title.innerHTML = '<strong>Spacing pegs</strong><span>Drag pegs to tune margin & padding</span>';

  const scaleToggle = document.createElement('div');
  scaleToggle.className = 'scale-toggle';
  scaleToggle.innerHTML = '<span>Snap</span>';

  [4, 8].forEach((step) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `${step}px grid`;
    btn.className = state.step === step ? 'active' : '';
    btn.addEventListener('click', () => {
      state.step = step;
      Array.from(scaleToggle.querySelectorAll('button')).forEach((b) => b.classList.toggle('active', b === btn));
      onChange();
    });
    scaleToggle.appendChild(btn);
  });

  toolbar.append(title, scaleToggle);
  return toolbar;
}

function buildStage() {
  const stage = document.createElement('div');
  stage.className = 'spacing-stage';

  const marginOutline = document.createElement('div');
  marginOutline.className = 'outline margin-outline';

  const paddingOutline = document.createElement('div');
  paddingOutline.className = 'outline padding-outline';

  const content = document.createElement('div');
  content.className = 'content-box';
  content.innerHTML = '<span>Selected element</span><small>Margin + padding demo</small>';

  stage.append(marginOutline, paddingOutline, content);
  return stage;
}

function createHandles(stage, state, onChange) {
  const handles = [];
  const layers = ['margin', 'padding'];
  const sides = ['top', 'right', 'bottom', 'left'];

  layers.forEach((layer) => {
    sides.forEach((side) => {
      const handle = document.createElement('button');
      const axis = side === 'left' || side === 'right' ? 'x' : 'y';
      handle.type = 'button';
      handle.className = `peg-handle ${layer} ${side} ${axis === 'x' ? 'horizontal' : 'vertical'}`;
      handle.dataset.layer = layer;
      handle.dataset.side = side;
      handle.dataset.axis = axis;
      handle.innerHTML = `${pegSVG(axis)}<div class="peg-meta"><div class="peg-label">${layer} ${side}</div><div class="peg-value"></div></div>`;

      handle.addEventListener('pointerdown', (event) => {
        startDrag(event, { layer, side, axis, state, stage, onChange });
      });

      handles.push(handle);
    });
  });

  const legend = document.createElement('div');
  legend.className = 'ghost-legend';
  legend.innerHTML = '<span class="dot margin"></span>margin ghost lines · <span class="dot padding"></span>padding ghost lines';
  stage.appendChild(legend);

  window.addEventListener('resize', () => positionHandles(stage, handles));
  return handles;
}

function startDrag(event, ctx) {
  event.preventDefault();
  const { layer, side, axis, state, stage, onChange } = ctx;
  const startValue = state[layer][side];
  const startPos = axis === 'x' ? event.clientX : event.clientY;

  const move = (e) => {
    const pos = axis === 'x' ? e.clientX : e.clientY;
    const delta = pos - startPos;
    const next = Math.max(0, snapSpacing(startValue + delta, state.step));
    state[layer][side] = next;
    onChange();
  };

  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    stage.classList.remove('dragging');
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  stage.classList.add('dragging');
}

function snapSpacing(value, step) {
  return Math.round(value / step) * step;
}

function applyVariables(stage, state) {
  const set = (key, value) => stage.style.setProperty(key, `${value}px`);
  set('--m-top', state.margin.top);
  set('--m-right', state.margin.right);
  set('--m-bottom', state.margin.bottom);
  set('--m-left', state.margin.left);
  set('--p-top', state.padding.top);
  set('--p-right', state.padding.right);
  set('--p-bottom', state.padding.bottom);
  set('--p-left', state.padding.left);
}

function syncHandleValues(handles, state) {
  handles.forEach((handle) => {
    const layer = handle.dataset.layer;
    const side = handle.dataset.side;
    handle.querySelector('.peg-value').textContent = `${state[layer][side]}px`;
  });
}

function positionHandles(stage, handles) {
  const margin = stage.querySelector('.margin-outline').getBoundingClientRect();
  const padding = stage.querySelector('.padding-outline').getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const boxes = { margin, padding };

  handles.forEach((handle) => {
    const box = boxes[handle.dataset.layer];
    const side = handle.dataset.side;
    const axis = handle.dataset.axis;
    const offset = 14;
    const centerX = box.left + box.width / 2 - stageRect.left;
    const centerY = box.top + box.height / 2 - stageRect.top;

    if (side === 'top') {
      handle.style.left = `${centerX}px`;
      handle.style.top = `${box.top - stageRect.top - offset}px`;
    } else if (side === 'bottom') {
      handle.style.left = `${centerX}px`;
      handle.style.top = `${box.bottom - stageRect.top + offset}px`;
    } else if (side === 'left') {
      handle.style.left = `${box.left - stageRect.left - offset}px`;
      handle.style.top = `${centerY}px`;
    } else if (side === 'right') {
      handle.style.left = `${box.right - stageRect.left + offset}px`;
      handle.style.top = `${centerY}px`;
    }

    handle.style.transform = axis === 'x' ? 'translate(-50%, -50%)' : 'translate(-50%, -50%) rotate(-90deg)';
  });
}

function renderSummary(state) {
  const margin = `${state.margin.top}px ${state.margin.right}px ${state.margin.bottom}px ${state.margin.left}px`;
  const padding = `${state.padding.top}px ${state.padding.right}px ${state.padding.bottom}px ${state.padding.left}px`;
  return `Margin: <code>${margin}</code> · Padding: <code>${padding}</code> · Snap: <strong>${state.step}px</strong>`;
}

function pegSVG(axis) {
  const studs = axis === 'x'
    ? [4, 18, 32, 46]
    : [4, 18, 32];
  const horizontal = axis === 'x';
  const width = horizontal ? 60 : 18;
  const height = horizontal ? 18 : 60;
  const color = '#0f172a';
  const body = '#fef6e4';

  const studRects = studs
    .map((offset) => {
      return horizontal
        ? `<rect x="${offset}" y="4" width="8" height="10" rx="2" fill="${color}" opacity="0.22" />`
        : `<rect x="4" y="${offset}" width="10" height="8" rx="2" fill="${color}" opacity="0.22" />`;
    })
    .join('');

  return `<svg class="peg-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="6" fill="${body}" stroke="${color}" stroke-width="1.5" opacity="0.9"/>${studRects}</svg>`;
}

function ensureStyles() {
  if (document.getElementById('spacing-block-style')) return;
  const style = document.createElement('style');
  style.id = 'spacing-block-style';
  style.textContent = `
  .spacing-lab { background: linear-gradient(180deg, rgba(43, 125, 233, 0.08), rgba(10, 54, 117, 0.2)); border: 1px solid var(--fp-border, #123055); border-radius: 16px; padding: 12px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 10px; }
  .spacing-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
  .spacing-title { display: flex; flex-direction: column; gap: 2px; font-size: 14px; color: #e2e8f0; }
  .spacing-title span { color: #9fb4d3; font-size: 12px; }
  .scale-toggle { display: flex; align-items: center; gap: 6px; }
  .scale-toggle span { color: #9fb4d3; font-size: 12px; letter-spacing: 0.03em; }
  .scale-toggle button { border-radius: 10px; border: 1px solid #123055; background: linear-gradient(180deg, #0e2c58, #0c2244); color: #e2e8f0; padding: 6px 10px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 0 rgba(0,0,0,0.18); }
  .scale-toggle button.active { background: linear-gradient(180deg, #ffe3b0, #ffce00); color: #0f172a; border-color: #e0a800; box-shadow: 0 4px 0 #c58d00; }
  .spacing-stage { --content-w: 200px; --content-h: 120px; --m-top: 20px; --m-right: 24px; --m-bottom: 20px; --m-left: 24px; --p-top: 16px; --p-right: 16px; --p-bottom: 16px; --p-left: 16px; position: relative; border-radius: 14px; border: 1px dashed rgba(255,255,255,0.15); background: radial-gradient(circle at 20% 20%, rgba(255,206,0,0.05), transparent 36%), radial-gradient(circle at 80% 20%, rgba(74,222,128,0.08), transparent 30%), #07152a; min-height: 280px; overflow: hidden; }
  .outline { position: absolute; border-radius: 12px; pointer-events: none; }
  .margin-outline { top: calc(50% - ((var(--content-h) + var(--p-top) + var(--p-bottom) + var(--m-top) + var(--m-bottom)) / 2)); left: calc(50% - ((var(--content-w) + var(--p-left) + var(--p-right) + var(--m-left) + var(--m-right)) / 2)); width: calc(var(--content-w) + var(--p-left) + var(--p-right) + var(--m-left) + var(--m-right)); height: calc(var(--content-h) + var(--p-top) + var(--p-bottom) + var(--m-top) + var(--m-bottom)); border: 2px dashed rgba(255, 206, 0, 0.6); background: repeating-linear-gradient(45deg, rgba(255, 206, 0, 0.08) 0, rgba(255, 206, 0, 0.08) 12px, transparent 12px, transparent 20px); }
  .padding-outline { top: calc(50% - ((var(--content-h) + var(--p-top) + var(--p-bottom)) / 2)); left: calc(50% - ((var(--content-w) + var(--p-left) + var(--p-right)) / 2)); width: calc(var(--content-w) + var(--p-left) + var(--p-right)); height: calc(var(--content-h) + var(--p-top) + var(--p-bottom)); border: 2px dashed rgba(74, 222, 128, 0.6); background: repeating-linear-gradient(-45deg, rgba(74,222,128,0.08) 0, rgba(74,222,128,0.08) 12px, transparent 12px, transparent 20px); }
  .content-box { position: absolute; top: calc(50% - (var(--content-h) / 2)); left: calc(50% - (var(--content-w) / 2)); width: var(--content-w); height: var(--content-h); border-radius: 12px; border: 3px solid #123055; background: linear-gradient(135deg, #ffce00, #ff5757); box-shadow: 0 10px 20px rgba(0,0,0,0.25); display: grid; place-items: center; text-align: center; color: #0f172a; font-weight: 800; letter-spacing: 0.04em; }
  .content-box small { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.02em; color: #0f172a; opacity: 0.8; }
  .peg-handle { position: absolute; z-index: 4; display: inline-flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 12px; border: 2px solid #123055; color: #0f172a; font-weight: 800; box-shadow: 0 8px 14px rgba(0,0,0,0.25); cursor: grab; background: linear-gradient(180deg, #fff, #dbeafe); }
  .peg-handle.margin { background: ${PEG_COLORS.margin.bg}; border-color: ${PEG_COLORS.margin.border}; }
  .peg-handle.padding { background: ${PEG_COLORS.padding.bg}; border-color: ${PEG_COLORS.padding.border}; }
  .peg-handle.vertical { flex-direction: row; }
  .peg-handle.horizontal { flex-direction: row; }
  .peg-handle:active { cursor: grabbing; }
  .peg-meta { display: grid; gap: 2px; text-align: left; }
  .peg-label { font-size: 11px; letter-spacing: 0.03em; color: #0f172a; text-transform: uppercase; }
  .peg-value { font-size: 12px; color: #0f172a; }
  .peg-svg { filter: drop-shadow(0 2px 0 rgba(0,0,0,0.25)); }
  .spacing-readout { color: #e2e8f0; font-size: 12px; letter-spacing: 0.02em; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 8px 10px; display: flex; gap: 8px; flex-wrap: wrap; }
  .spacing-readout code { background: rgba(0,0,0,0.18); padding: 3px 6px; border-radius: 8px; color: #fef6e4; }
  .ghost-legend { position: absolute; bottom: 10px; right: 12px; font-size: 11px; color: #9fb4d3; background: rgba(0,0,0,0.32); padding: 6px 8px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); display: flex; gap: 8px; align-items: center; }
  .ghost-legend .dot { width: 12px; height: 12px; border-radius: 4px; display: inline-block; }
  .ghost-legend .dot.margin { border: 2px dashed rgba(255, 206, 0, 0.8); background: rgba(255, 206, 0, 0.1); }
  .ghost-legend .dot.padding { border: 2px dashed rgba(74, 222, 128, 0.8); background: rgba(74, 222, 128, 0.1); }
  .spacing-stage.dragging .content-box { box-shadow: 0 0 0 4px rgba(255,255,255,0.16), 0 12px 24px rgba(0,0,0,0.32); }
  `;
  document.head.appendChild(style);
}
