import { createMaterial } from './glMaterials.js';

const settings = {
  blurAmount: 0.0,
  vignetteAmount: 0.35,
  chromaOffset: 0.0,
  glitchAmount: 0.0,
};

const state = {
  gl: null,
  framebuffer: null,
  texture: null,
  depth: null,
  quad: null,
  material: null,
};

function createQuad(gl) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  return buffer;
}

function createFramebuffer(gl, width, height) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const depth = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  state.framebuffer = framebuffer;
  state.texture = texture;
  state.depth = depth;
}

function initPostFX(gl) {
  state.gl = gl;
  state.quad = createQuad(gl);
  const vertex = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main(){
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;
  const fragment = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_texture;
    uniform vec2 u_resolution;
    uniform float u_blur;
    uniform float u_vignette;
    uniform float u_chroma;
    uniform float u_glitch;

    vec3 sampleColor(vec2 uv, float offset){
      vec2 shift = vec2(cos(offset), sin(offset)) * 0.002 * u_chroma;
      float vignette = smoothstep(0.8, 0.2, distance(uv, vec2(0.5)));
      vec3 base = texture2D(u_texture, uv + shift).rgb;
      return mix(base, base * vignette, u_vignette);
    }

    void main(){
      vec2 uv = v_uv;
      if(u_glitch > 0.0){
        float slice = step(0.5, fract(sin(dot(uv * u_resolution, vec2(12.3, 45.6))) * 43758.5453123));
        uv.x += (slice - 0.5) * 0.02 * u_glitch;
      }
      vec3 color = sampleColor(uv, 1.2);
      if(u_blur > 0.0){
        color += sampleColor(uv + vec2(0.001), 2.2);
        color += sampleColor(uv - vec2(0.001), 3.5);
        color /= 3.0;
      }
      gl_FragColor = vec4(color, 1.0);
    }
  `;
  state.material = createMaterial(gl, 'postfx', vertex, fragment);
  createFramebuffer(gl, gl.canvas.width || 1, gl.canvas.height || 1);
}

function setPostFXSettings(partial) {
  Object.assign(settings, partial);
}

function resize(width, height) {
  if (!state.gl) return;
  createFramebuffer(state.gl, width, height);
}

function applyPostFX(gl, sourceFramebuffer, targetFramebuffer, runtime) {
  if (!state.material || !state.texture) return;
  gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(state.material.program);
  const positionLoc = gl.getAttribLocation(state.material.program, 'a_position');
  gl.bindBuffer(gl.ARRAY_BUFFER, state.quad);
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
  const resolution = runtime?.resolution || [gl.canvas.width, gl.canvas.height];
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, state.texture);
  gl.uniform1i(gl.getUniformLocation(state.material.program, 'u_texture'), 0);
  gl.uniform2fv(gl.getUniformLocation(state.material.program, 'u_resolution'), resolution);
  gl.uniform1f(gl.getUniformLocation(state.material.program, 'u_blur'), settings.blurAmount);
  gl.uniform1f(gl.getUniformLocation(state.material.program, 'u_vignette'), settings.vignetteAmount);
  gl.uniform1f(gl.getUniformLocation(state.material.program, 'u_chroma'), settings.chromaOffset);
  gl.uniform1f(gl.getUniformLocation(state.material.program, 'u_glitch'), settings.glitchAmount);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

const postProcessor = {
  get framebuffer() {
    return state.framebuffer;
  },
  get useFramebuffer() {
    return true;
  },
  resize(width, height) {
    resize(width, height);
  },
  apply(gl, sourceFramebuffer, targetFramebuffer, runtime) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, sourceFramebuffer);
    gl.bindTexture(gl.TEXTURE_2D, state.texture);
    applyPostFX(gl, sourceFramebuffer, targetFramebuffer, runtime);
  },
};

export { initPostFX, setPostFXSettings, applyPostFX, postProcessor };
