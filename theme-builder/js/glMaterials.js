function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Shader compile failed: ' + info);
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  const vs = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error('Program link failed: ' + info);
  }
  return program;
}

function setUniform(gl, program, name, value) {
  const location = gl.getUniformLocation(program, name);
  if (location === null || location === undefined) return;
  if (typeof value === 'number') {
    gl.uniform1f(location, value);
  } else if (Array.isArray(value)) {
    if (value.length === 2) gl.uniform2fv(location, value);
    if (value.length === 3) gl.uniform3fv(location, value);
    if (value.length === 4) gl.uniform4fv(location, value);
  } else if (typeof value === 'boolean') {
    gl.uniform1i(location, value ? 1 : 0);
  }
}

function createMaterial(gl, id, vertexSource, fragmentSource) {
  const program = createProgram(gl, vertexSource, fragmentSource);
  const material = {
    id,
    program,
    uniforms: {},
    setUniform(name, value) {
      this.uniforms[name] = value;
      setUniform(gl, program, name, value);
    },
  };
  return material;
}

function applyThemeToUniforms(material, themeState) {
  if (!material || !themeState) return;
  const uniforms = {
    u_mainBg: themeState.mainBgColor || [0.05, 0.09, 0.18],
    u_accent: themeState.accentColor || [1.0, 0.78, 0.0],
    u_border: themeState.borderColor || [0.07, 0.25, 0.42],
    u_spacing: themeState.spacingScale ?? 1,
    u_depth: themeState.depthIntensity ?? 0.25,
  };
  Object.entries(uniforms).forEach(([key, value]) => {
    material.setUniform(key, value);
  });
}

export { createShader, createProgram, createMaterial, setUniform, applyThemeToUniforms };
