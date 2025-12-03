// Fisher-Price Theme Builder - WebGL Playground
import MaterialLoader from './materialLoader.js';

const vertexShaderSrc = `
attribute vec2 a_position;
attribute vec2 a_uv;
varying vec2 v_uv;
void main() {
  v_uv = a_uv;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const shaderLibrary = {
  blur: {
    label: 'Dreamy Blur',
    fragment: `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_amount;
void main() {
  vec2 off = vec2(u_amount) / u_resolution;
  vec4 c = texture2D(u_tex, v_uv) * 0.204164;
  c += texture2D(u_tex, v_uv + off * vec2(1.0, 0.0)) * 0.150000;
  c += texture2D(u_tex, v_uv - off * vec2(1.0, 0.0)) * 0.150000;
  c += texture2D(u_tex, v_uv + off * vec2(0.0, 1.0)) * 0.150000;
  c += texture2D(u_tex, v_uv - off * vec2(0.0, 1.0)) * 0.150000;
  c += texture2D(u_tex, v_uv + off * vec2(1.0, 1.0)) * 0.099918;
  c += texture2D(u_tex, v_uv - off * vec2(1.0, 1.0)) * 0.099918;
  gl_FragColor = c;
}`,
    params: [{ key: 'u_amount', label: 'Blur', min: 0.5, max: 8, step: 0.1, value: 2 }]
  },
  swirl: {
    label: 'Swirl',
    fragment: `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_amount;
void main() {
  vec2 c = v_uv - 0.5;
  float angle = u_amount * length(c);
  float s = sin(angle);
  float cs = cos(angle);
  mat2 rot = mat2(cs, -s, s, cs);
  vec2 uv = rot * c + 0.5;
  gl_FragColor = texture2D(u_tex, uv);
}`,
    params: [{ key: 'u_amount', label: 'Swirl', min: -10, max: 10, step: 0.1, value: 3 }]
  },
  rgbSplit: {
    label: 'RGB Split',
    fragment: `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_amount;
void main() {
  vec2 off = vec2(u_amount);
  float r = texture2D(u_tex, v_uv + off).r;
  float g = texture2D(u_tex, v_uv).g;
  float b = texture2D(u_tex, v_uv - off).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}`,
    params: [{ key: 'u_amount', label: 'Split', min: -0.01, max: 0.01, step: 0.0005, value: 0.004 }]
  },
  oldTV: {
    label: 'Old TV',
    fragment: `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_amount;
float rand(vec2 co){ return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453); }
void main() {
  vec2 uv = v_uv;
  uv.y += sin(uv.y * 40.0 + u_amount * 10.0) * 0.003;
  float noise = rand(uv + u_amount) * 0.05;
  vec4 c = texture2D(u_tex, uv) + noise;
  float scan = step(0.5, fract(uv.y * u_resolution.y * 0.5));
  gl_FragColor = vec4(c.rgb * (0.9 + 0.1 * scan), 1.0);
}`,
    params: [{ key: 'u_amount', label: 'Distortion', min: 0, max: 3, step: 0.05, value: 0.6 }]
  },
  pixelate: {
    label: 'Pixelate',
    fragment: `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_amount;
void main() {
  vec2 d = u_amount / u_resolution;
  vec2 uv = floor(v_uv / d) * d;
  gl_FragColor = texture2D(u_tex, uv);
}`,
    params: [{ key: 'u_amount', label: 'Pixel Size', min: 1, max: 40, step: 1, value: 12 }]
  },
  heatmap: {
    label: 'Heatmap',
    fragment: `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_amount;
vec3 gradient(float t) {
  return vec3(
    smoothstep(0.0, 0.35, t),
    smoothstep(0.25, 0.75, t),
    smoothstep(0.55, 1.0, 1.0 - t)
  );
}
void main() {
  vec4 c = texture2D(u_tex, v_uv);
  float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  vec3 heat = gradient(clamp(l + u_amount * 0.25, 0.0, 1.0));
  gl_FragColor = vec4(heat, c.a);
}`,
    params: [{ key: 'u_amount', label: 'Intensity', min: -1, max: 1, step: 0.02, value: 0 }]
  },
  displacement: {
    label: 'Displacement Noise',
    fragment: `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_amount;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
}
void main(){
  vec2 n = vec2(noise(v_uv * 40.0), noise(v_uv * 40.0 + 5.0));
  vec2 uv = v_uv + (n - 0.5) * u_amount * 0.02;
  gl_FragColor = texture2D(u_tex, uv);
}`,
    params: [{ key: 'u_amount', label: 'Warp', min: 0, max: 10, step: 0.1, value: 4 }]
  }
};

let playgroundState = {
  gl: null,
  program: null,
  canvas: null,
  material: null,
  uniforms: {},
  buffers: {},
  currentShader: 'blur'
};

function ensurePanel() {
  let container = document.getElementById('webgl-playground');
  if (container) return container;
  const style = document.createElement('style');
  style.textContent = `
    #webgl-playground {
      position: fixed;
      top: 70px;
      right: 12px;
      width: 360px;
      background: #111e2e;
      color: #e9f6ff;
      border: 2px solid #5ad1ff;
      border-radius: 12px;
      z-index: 8000;
      padding: 10px;
      box-shadow: 0 10px 24px rgba(0,0,0,0.45);
      font-family: 'Segoe UI', sans-serif;
    }
    #webgl-playground h3 { margin: 6px 0 8px; color: #ffe24a; }
    #webgl-playground select, #webgl-playground button, #webgl-playground input[type=range] {
      width: 100%; margin: 4px 0 8px; background: #0d1620; color: #fff; border: 1px solid #5ad1ff; border-radius: 6px; padding: 6px;
    }
    #webgl-playground canvas { width: 100%; height: 200px; background: #000; border-radius: 8px; }
    #webgl-playground .param-row { display: flex; align-items: center; gap: 6px; }
    #webgl-playground .param-row label { flex: 1; font-size: 12px; }
    #webgl-playground .param-row input { flex: 2; }
  `;
  document.head.appendChild(style);

  container = document.createElement('div');
  container.id = 'webgl-playground';

  const title = document.createElement('h3');
  title.textContent = 'WebGL Remix Lab';

  const shaderSelect = document.createElement('select');
  Object.keys(shaderLibrary).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = shaderLibrary[key].label;
    shaderSelect.appendChild(opt);
  });

  const paramsContainer = document.createElement('div');
  paramsContainer.id = 'webgl-params';

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export PNG';
  exportBtn.addEventListener('click', () => exportPNG());

  container.append(title, shaderSelect, paramsContainer, canvas, exportBtn);
  document.body.appendChild(container);

  shaderSelect.addEventListener('change', (e) => switchShader(e.target.value));

  playgroundState.canvas = canvas;
  setupGL(canvas);
  switchShader(playgroundState.currentShader);
  return container;
}

function setupGL(canvas) {
  const gl = canvas.getContext('webgl');
  if (!gl) throw new Error('WebGL not supported');
  playgroundState.gl = gl;
  const vs = compile(gl, gl.VERTEX_SHADER, vertexShaderSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, shaderLibrary[playgroundState.currentShader].fragment);
  const program = link(gl, vs, fs);
  gl.useProgram(program);
  playgroundState.program = program;
  const quad = new Float32Array([
    -1, -1, 0, 0,
    1, -1, 1, 0,
    -1, 1, 0, 1,
    1, 1, 1, 1
  ]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
  const stride = 4 * 4;
  const aPos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
  const aUv = gl.getAttribLocation(program, 'a_uv');
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, stride, 8);
  playgroundState.buffers.quad = buffer;
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || 'Shader compile error');
  }
  return shader;
}

function link(gl, vs, fs) {
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || 'Program link error');
  }
  return program;
}

function switchShader(key) {
  const definition = shaderLibrary[key];
  if (!definition) return;
  playgroundState.currentShader = key;
  const gl = playgroundState.gl;
  if (!gl) return;
  const vs = compile(gl, gl.VERTEX_SHADER, vertexShaderSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, definition.fragment);
  const program = link(gl, vs, fs);
  gl.useProgram(program);
  playgroundState.program = program;

  const buffer = playgroundState.buffers.quad;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const stride = 4 * 4;
  const aPos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
  const aUv = gl.getAttribLocation(program, 'a_uv');
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, stride, 8);

  setupParams(definition.params || []);
  render();
}

function setupParams(params) {
  const paramsContainer = document.getElementById('webgl-params');
  paramsContainer.innerHTML = '';
  const gl = playgroundState.gl;
  const program = playgroundState.program;
  playgroundState.uniforms = {};

  // Always present uniforms
  playgroundState.uniforms.u_tex = gl.getUniformLocation(program, 'u_tex');
  playgroundState.uniforms.u_resolution = gl.getUniformLocation(program, 'u_resolution');

  params.forEach(param => {
    const row = document.createElement('div');
    row.className = 'param-row';
    const label = document.createElement('label');
    label.textContent = param.label;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = param.min;
    slider.max = param.max;
    slider.step = param.step;
    slider.value = param.value;
    slider.addEventListener('input', () => {
      playgroundState.uniforms[param.key] = parseFloat(slider.value);
      render();
    });
    playgroundState.uniforms[param.key] = param.value;
    row.append(label, slider);
    paramsContainer.appendChild(row);
  });
}

async function loadTexture(material) {
  const gl = playgroundState.gl;
  if (!gl) return null;
  const texture = gl.createTexture();
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const src = material?.preview || material?.path || material;
  if (!src) return null;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = src;
  });
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  playgroundState.texture = texture;
  render();
  return texture;
}

export async function openWebGLPlayground(material) {
  await MaterialLoader.init().catch(() => {});
  const container = ensurePanel();
  container.style.display = 'block';
  playgroundState.material = material || MaterialLoader.getRandomTexture() || MaterialLoader.getRandomPattern();
  if (playgroundState.material) await loadTexture(playgroundState.material);
  render();
  return container;
}

export function render() {
  const gl = playgroundState.gl;
  const canvas = playgroundState.canvas;
  if (!gl || !canvas) return;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const program = playgroundState.program;
  gl.useProgram(program);

  // uniforms
  gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
  Object.entries(playgroundState.uniforms).forEach(([key, value]) => {
    if (key === 'u_tex' || key === 'u_resolution') return;
    const loc = gl.getUniformLocation(program, key);
    if (loc) gl.uniform1f(loc, value);
  });

  if (playgroundState.texture) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, playgroundState.texture);
    gl.uniform1i(gl.getUniformLocation(program, 'u_tex'), 0);
  }

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  document.dispatchEvent(new Event('webgl:render'));
}

export function exportPNG() {
  if (!playgroundState.canvas) return null;
  const dataUrl = playgroundState.canvas.toDataURL('image/png');
  document.dispatchEvent(new CustomEvent('webgl:export', { detail: dataUrl }));
  return dataUrl;
}

export default { openWebGLPlayground, render, exportPNG };
