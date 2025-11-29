import { removeRenderable, getGL, addRenderable as registerRenderable } from './glEngine.js';

let activeRenderableId = null;
let logTarget = null;
let canvas = null;
let mode = '2d';

function log(message) {
  if (!logTarget) return;
  const line = document.createElement('div');
  line.textContent = message;
  logTarget.appendChild(line);
  logTarget.scrollTop = logTarget.scrollHeight;
}

function safeEval(source, context) {
  return Function('context', `'use strict';\n${source};\nreturn { setup: typeof setup === 'function' ? setup : null, update: typeof update === 'function' ? update : null };`)(context);
}

function runUserCode(sourceCode) {
  if (!canvas) return;
  const gl = mode === 'webgl' ? getGL() : null;
  const ctx2d = mode === '2d' ? canvas.getContext('2d') : null;
  const context = {
    gl,
    canvas,
    ctx2d,
    width: canvas.width,
    height: canvas.height,
    themeState: {
      mainBgColor: [0.05, 0.09, 0.18],
      accentColor: [1.0, 0.78, 0.0],
      borderColor: [0.07, 0.25, 0.42],
      spacingScale: 1,
    },
    log,
  };
  try {
    const result = safeEval(sourceCode, context);
    const setupResult = result.setup?.(context) || {};
    if (activeRenderableId) {
      removeRenderable(activeRenderableId);
      activeRenderableId = null;
    }
    let lastTime = performance.now();
    if (mode === 'webgl') {
      const id = `playground-${Date.now()}`;
      const renderable = {
        id,
        draw: (_gl, time, delta) => {
          result.update?.(context, time, delta, setupResult);
        },
      };
      registerRenderable(renderable);
      activeRenderableId = id;
    } else {
      const loop = (now) => {
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        result.update?.(context, now / 1000, delta, setupResult);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  } catch (error) {
    log(error.message);
  }
}

function initCreativePlayground(rootElement, onRun) {
  const wrapper = document.createElement('div');
  wrapper.className = 'playground-shell';
  const header = document.createElement('div');
  header.className = 'playground-toolbar';
  const modeToggle = document.createElement('select');
  ['2d', 'webgl'].forEach((m) => {
    const option = document.createElement('option');
    option.value = m;
    option.textContent = m.toUpperCase();
    modeToggle.appendChild(option);
  });
  modeToggle.addEventListener('change', (e) => {
    mode = e.target.value;
  });
  const runBtn = document.createElement('button');
  runBtn.textContent = 'Run';
  header.append(modeToggle, runBtn);

  const editor = document.createElement('textarea');
  editor.className = 'playground-editor';
  editor.value = `// Write tiny sketches here\nfunction setup(ctx){\n  ctx.log('setup!');\n}\nfunction update(ctx, time){\n  if(ctx.ctx2d){\n    ctx.ctx2d.clearRect(0,0,ctx.width,ctx.height);\n    ctx.ctx2d.fillStyle = '#ffce00';\n    ctx.ctx2d.beginPath();\n    ctx.ctx2d.arc(ctx.width/2 + Math.sin(time)*80, ctx.height/2, 40, 0, Math.PI*2);\n    ctx.ctx2d.fill();\n  }\n}`;

  const preview = document.createElement('div');
  preview.className = 'playground-preview';
  canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 320;
  preview.appendChild(canvas);

  const consoleArea = document.createElement('div');
  consoleArea.className = 'playground-console';
  logTarget = consoleArea;

  runBtn.addEventListener('click', () => {
    const source = editor.value;
    onRun?.(source);
    runUserCode(source);
  });

  wrapper.append(header, editor, preview, consoleArea);
  rootElement.appendChild(wrapper);
  return {
    setSource(code) {
      editor.value = code;
    },
  };
}

function loadExampleSketch(id) {
  const examples = {
    orbs: `function setup(ctx){ ctx.phase = 0; }
function update(ctx, time, dt){ ctx.phase += dt; const c = ctx.ctx2d; c.clearRect(0,0,ctx.width,ctx.height); for(let i=0;i<10;i++){ const r = 20 + i*6; c.strokeStyle = i%2? '#ff5757':'#ffce00'; c.lineWidth = 3; c.beginPath(); c.arc(ctx.width/2 + Math.sin(time + i)*30, ctx.height/2 + Math.cos(time*0.5+i)*12, r,0,Math.PI*2); c.stroke(); } }`,
  };
  return examples[id] || '';
}

export { initCreativePlayground, loadExampleSketch, runUserCode };
