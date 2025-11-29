const renderables = new Map();
let orderedRenderables = [];
let gl = null;
let canvas = null;
let rafId = null;
let paused = false;
let lastTime = 0;
let postProcessor = null;
let deviceRatio = window.devicePixelRatio || 1;

function sortRenderables() {
  orderedRenderables = Array.from(renderables.values()).sort((a, b) => (a.priority || 0) - (b.priority || 0));
}

function resizeCanvas() {
  if (!canvas || !gl) return;
  deviceRatio = window.devicePixelRatio || 1;
  const width = Math.floor(canvas.clientWidth * deviceRatio) || canvas.width;
  const height = Math.floor(canvas.clientHeight * deviceRatio) || canvas.height;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    if (postProcessor && postProcessor.resize) {
      postProcessor.resize(width, height);
    }
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
}

function handleContextLoss() {
  if (!canvas) return;
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    cancelAnimationFrame(rafId);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    if (!canvas) return;
    initContext(canvas);
  });
}

function initContext(targetCanvas) {
  canvas = targetCanvas;
  gl = canvas.getContext('webgl2', { antialias: true }) || canvas.getContext('webgl', { antialias: true });
  if (!gl) {
    throw new Error('WebGL not supported');
  }
  resizeCanvas();
  if (postProcessor && postProcessor.resize) {
    postProcessor.resize(canvas.width, canvas.height);
  }
  lastTime = performance.now();
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function loop(now) {
  if (!gl) return;
  const delta = (now - lastTime) / 1000;
  lastTime = now;
  resizeCanvas();
  const timeSec = now / 1000;
  const sourceFramebuffer = postProcessor?.framebuffer || null;
  if (sourceFramebuffer && postProcessor?.useFramebuffer) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, sourceFramebuffer);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  gl.clearColor(0.02, 0.08, 0.16, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const resolution = [canvas.width, canvas.height];
  if (!paused) {
    orderedRenderables.forEach((renderable) => {
      try {
        renderable.draw?.(gl, timeSec, delta, resolution);
      } catch (error) {
        console.warn('Renderable failed', renderable.id, error);
      }
    });
  }
  if (postProcessor && postProcessor.apply) {
    postProcessor.apply(gl, sourceFramebuffer, null, { time: timeSec, delta, resolution });
  }
  rafId = requestAnimationFrame(loop);
}

export function initGL(canvasElement) {
  initContext(canvasElement);
  handleContextLoss();
  return Promise.resolve(gl);
}

export function getGL() {
  return gl;
}

export function addRenderable(renderable) {
  if (!renderable?.id) {
    throw new Error('Renderable must have an id');
  }
  renderables.set(renderable.id, renderable);
  sortRenderables();
}

export function removeRenderable(id) {
  renderables.delete(id);
  sortRenderables();
}

export function setPaused(state) {
  paused = state;
}

export function setPostProcessor(handler) {
  postProcessor = handler;
  if (postProcessor && canvas && postProcessor.resize) {
    postProcessor.resize(canvas.width, canvas.height);
  }
}

export function getResolution() {
  return canvas ? [canvas.width, canvas.height] : [0, 0];
}
