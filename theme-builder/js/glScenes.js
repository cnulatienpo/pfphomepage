import { addRenderable, removeRenderable, getGL } from './glEngine.js';
import { createMaterial, applyThemeToUniforms } from './glMaterials.js';

const sceneDefinitions = new Map();
const sceneInstances = new Map();

function createQuad(gl) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]),
    gl.STATIC_DRAW,
  );
  return buffer;
}

function registerScene(definition) {
  if (!definition?.id) throw new Error('Scene must include an id');
  sceneDefinitions.set(definition.id, definition);
}

function listScenes() {
  return Array.from(sceneDefinitions.values());
}

function createSceneInstance(sceneId, params = {}) {
  const definition = sceneDefinitions.get(sceneId);
  const gl = getGL();
  if (!definition || !gl) return null;
  const merged = { ...(definition.defaultParams || {}), ...params };
  const instance = definition.init(gl, merged);
  sceneInstances.set(instance.id, instance);
  return instance;
}

function destroySceneInstance(instanceId) {
  const instance = sceneInstances.get(instanceId);
  if (!instance) return;
  removeRenderable(instance.renderableId);
  instance.dispose?.();
  sceneInstances.delete(instanceId);
}

// Default scenes
function noisyGradientScene() {
  return {
    id: 'noisy-gradient',
    name: 'Noisy Gradient',
    description: 'Soft animated gradient that reacts to theme colors.',
    defaultParams: { speed: 0.4, grain: 0.18 },
    init(gl, params) {
      const quad = createQuad(gl);
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
        uniform vec2 u_resolution;
        uniform float u_time;
        uniform vec3 u_mainBg;
        uniform vec3 u_accent;
        uniform float u_grain;
        float random(vec2 st){
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        void main(){
          vec2 uv = v_uv;
          float wave = sin((uv.x + u_time * ${params.speed.toFixed(2)}) * 3.14159) * 0.2;
          vec3 base = mix(u_mainBg, u_accent, uv.y + wave);
          float n = random(uv * u_resolution.xy + u_time);
          base += (n - 0.5) * u_grain;
          gl_FragColor = vec4(base, 1.0);
        }
      `;
      const material = createMaterial(gl, 'noisy-gradient', vertex, fragment);
      applyThemeToUniforms(material, params.theme || {});
      const renderableId = 'scene-noisy-gradient';
      const draw = (context, time, _delta, resolution) => {
        gl.useProgram(material.program);
        const positionLoc = gl.getAttribLocation(material.program, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        material.setUniform('u_time', time);
        material.setUniform('u_resolution', resolution);
        material.setUniform('u_grain', params.grain);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      };
      addRenderable({ id: renderableId, draw, priority: -10 });
      return {
        id: 'noisy-gradient-instance',
        renderableId,
        params,
        setParam(key, value) {
          params[key] = value;
        },
        dispose() {
          gl.deleteBuffer(quad);
        },
      };
    },
  };
}

function particleFieldScene() {
  return {
    id: 'particle-field',
    name: 'Particle Field',
    description: 'Playful points drifting using additive blending.',
    defaultParams: { count: 120, speed: 0.5, size: 6 },
    init(gl, params) {
      const positions = new Float32Array(params.count * 2);
      for (let i = 0; i < params.count * 2; i++) positions[i] = Math.random() * 2 - 1;
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
      const vertex = `
        attribute vec2 a_position;
        uniform float u_pointSize;
        varying vec2 v_pos;
        void main(){
          v_pos = a_position;
          gl_Position = vec4(a_position, 0.0, 1.0);
          gl_PointSize = u_pointSize;
        }
      `;
      const fragment = `
        precision mediump float;
        varying vec2 v_pos;
        uniform float u_time;
        uniform vec3 u_accent;
        uniform vec3 u_border;
        void main(){
          vec2 uv = gl_PointCoord * 2.0 - 1.0;
          float dist = dot(uv, uv);
          float alpha = smoothstep(1.0, 0.2, dist);
          vec3 color = mix(u_border, u_accent, alpha);
          gl_FragColor = vec4(color, alpha);
        }
      `;
      const material = createMaterial(gl, 'particle-field', vertex, fragment);
      applyThemeToUniforms(material, params.theme || {});
      const renderableId = 'scene-particle-field';
      const draw = (_gl, time, delta) => {
        for (let i = 0; i < positions.length; i += 2) {
          positions[i] += (Math.sin(time + i) * 0.0006 + params.speed * 0.0008) * delta * 60;
          positions[i + 1] += (Math.cos(time + i * 1.3) * 0.0006 + params.speed * 0.0006) * delta * 60;
          if (positions[i] > 1) positions[i] = -1;
          if (positions[i] < -1) positions[i] = 1;
          if (positions[i + 1] > 1) positions[i + 1] = -1;
          if (positions[i + 1] < -1) positions[i + 1] = 1;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
        gl.useProgram(material.program);
        const positionLoc = gl.getAttribLocation(material.program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        material.setUniform('u_time', time);
        material.setUniform('u_pointSize', params.size);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.drawArrays(gl.POINTS, 0, params.count);
        gl.disable(gl.BLEND);
      };
      addRenderable({ id: renderableId, draw, priority: -5 });
      return {
        id: 'particle-field-instance',
        renderableId,
        params,
        setParam(key, value) {
          params[key] = value;
        },
        dispose() {
          gl.deleteBuffer(buffer);
        },
      };
    },
  };
}

registerScene(noisyGradientScene());
registerScene(particleFieldScene());

export { registerScene, listScenes, createSceneInstance, destroySceneInstance };
