/**
 * Fisher-Price style filter toolkit.
 *
 * The API is intentionally lightweight: call `applyFilter(layer, effectName, value)`
 * to push a single effect onto a canvas layer or DOM element. Effects lean on
 * CSS filters where possible and fall back to offscreen canvas work for
 * heavier pixel operations.
 */

const DEFAULT_FILTERS = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  blur: 0,
  invert: 0,
  grayscale: 0,
  sepia: 0,
};

const kernels = {
  sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  emboss: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
  bevelLight: [1, 0, -1, 0, 1, -1, 1, 0, -1],
};

function createOffscreen(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function resolveTarget(layer) {
  if (!layer) return {};
  if (layer.getContext) {
    const ctx = layer.getContext('2d');
    return { canvas: layer, ctx };
  }
  if (layer instanceof CanvasRenderingContext2D) {
    return { canvas: layer.canvas, ctx: layer };
  }
  if (layer.canvas && layer.canvas.getContext) {
    return { canvas: layer.canvas, ctx: layer.canvas.getContext('2d'), element: layer.element || null };
  }
  if (layer.element) {
    return { element: layer.element };
  }
  if (layer.style) {
    return { element: layer };
  }
  return {};
}

function ensureState(layer) {
  if (!layer.__filterState) {
    layer.__filterState = { ...DEFAULT_FILTERS };
  }
  return layer.__filterState;
}

function updateCssFilters(target, state) {
  const filterString = `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%) hue-rotate(${state.hue}deg) blur(${state.blur}px) invert(${state.invert}%) grayscale(${state.grayscale}%) sepia(${state.sepia}%)`;
  if (target.element && target.element.style) {
    target.element.style.filter = filterString;
  }
  if (target.ctx) {
    target.ctx.filter = filterString;
  }
  return filterString;
}

function applyConvolution(target, kernel, amount = 1, bias = 0) {
  if (!target.ctx || !target.canvas) return;
  const { width, height } = target.canvas;
  if (!width || !height) return;
  const offscreen = createOffscreen(width, height);
  const offCtx = offscreen.getContext('2d');
  offCtx.drawImage(target.canvas, 0, 0);
  const src = offCtx.getImageData(0, 0, width, height);
  const dst = offCtx.createImageData(width, height);
  const side = Math.sqrt(kernel.length);
  const halfSide = Math.floor(side / 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = 0; ky < side; ky++) {
        for (let kx = 0; kx < side; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx - halfSide));
          const py = Math.min(height - 1, Math.max(0, y + ky - halfSide));
          const srcIndex = (py * width + px) * 4;
          const weight = kernel[ky * side + kx] * amount;
          r += src.data[srcIndex] * weight;
          g += src.data[srcIndex + 1] * weight;
          b += src.data[srcIndex + 2] * weight;
        }
      }
      const dstIndex = (y * width + x) * 4;
      dst.data[dstIndex] = Math.min(255, Math.max(0, r + bias));
      dst.data[dstIndex + 1] = Math.min(255, Math.max(0, g + bias));
      dst.data[dstIndex + 2] = Math.min(255, Math.max(0, b + bias));
      dst.data[dstIndex + 3] = src.data[dstIndex + 3];
    }
  }
  target.ctx.putImageData(dst, 0, 0);
}

function applyVignette(target, value = 0.5) {
  if (!target.ctx || !target.canvas) {
    if (target.element?.style) {
      const strength = Math.min(1, Math.max(0, value));
      target.element.style.boxShadow = `inset 0 0 ${80 * strength}px ${50 * strength}px rgba(0,0,0,${0.5 * strength})`;
    }
    return;
  }
  const { width, height } = target.canvas;
  const radius = Math.min(width, height) * (0.75 + value * 0.25);
  const grad = target.ctx.createRadialGradient(width / 2, height / 2, radius * 0.35, width / 2, height / 2, radius);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${0.65 * value})`);
  target.ctx.save();
  target.ctx.globalCompositeOperation = 'multiply';
  target.ctx.fillStyle = grad;
  target.ctx.fillRect(0, 0, width, height);
  target.ctx.restore();
}

function applyGrain(target, value = 0.35) {
  if (!target.ctx || !target.canvas) {
    if (target.element?.style) {
      const opacity = Math.min(1, Math.max(0, value));
      target.element.style.backgroundImage = `repeating-linear-gradient(45deg, rgba(255,255,255,${0.02 * opacity}) 0 2px, rgba(0,0,0,${0.02 * opacity}) 2px 4px)`;
      target.element.style.mixBlendMode = 'overlay';
    }
    return;
  }
  const { width, height } = target.canvas;
  const density = Math.max(1, Math.floor(500 * value));
  target.ctx.save();
  target.ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < density; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const alpha = 0.04 + Math.random() * 0.08 * value;
    const shade = Math.random() > 0.5 ? 255 : 0;
    target.ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha})`;
    target.ctx.fillRect(x, y, 1, 1);
  }
  target.ctx.restore();
}

function applyTexturePressure(target, value = 0.4) {
  if (!target.ctx || !target.canvas) {
    if (target.element?.style) {
      const strength = Math.min(1, Math.max(0, value));
      target.element.style.backgroundImage = `linear-gradient(135deg, rgba(255,255,255,${0.12 * strength}) 0%, rgba(0,0,0,${0.08 * strength}) 100%)`;
      target.element.style.backgroundBlendMode = 'overlay';
    }
    return;
  }
  const { width, height } = target.canvas;
  target.ctx.save();
  target.ctx.globalCompositeOperation = 'overlay';
  const gradient = target.ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `rgba(255,255,255,${0.2 * value})`);
  gradient.addColorStop(1, `rgba(0,0,0,${0.15 * value})`);
  target.ctx.fillStyle = gradient;
  target.ctx.fillRect(0, 0, width, height);
  target.ctx.restore();
}

function applyScratchiness(target, value = 0.5) {
  if (!target.ctx || !target.canvas) {
    return;
  }
  const { width, height } = target.canvas;
  const lines = Math.floor(20 * value);
  target.ctx.save();
  target.ctx.globalAlpha = 0.35 * value;
  target.ctx.lineWidth = 0.8;
  target.ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < lines; i++) {
    const x = Math.random() * width;
    target.ctx.beginPath();
    target.ctx.moveTo(x, 0);
    target.ctx.lineTo(x + (Math.random() - 0.5) * 20, height);
    target.ctx.stroke();
  }
  target.ctx.restore();
}

function applyInkWeight(target, value = 0.5) {
  if (!target.ctx || !target.canvas) {
    if (target.element?.style) {
      target.element.style.textShadow = `0 0 ${Math.max(1, value * 4)}px currentColor`;
    }
    return;
  }
  const { width, height } = target.canvas;
  const offscreen = createOffscreen(width, height);
  const offCtx = offscreen.getContext('2d');
  offCtx.drawImage(target.canvas, 0, 0);
  const passes = Math.max(1, Math.round(value * 6));
  target.ctx.save();
  target.ctx.clearRect(0, 0, width, height);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      target.ctx.globalAlpha = 0.12 * passes;
      target.ctx.drawImage(offscreen, dx * passes, dy * passes);
    }
  }
  target.ctx.globalAlpha = 1;
  target.ctx.drawImage(offscreen, 0, 0);
  target.ctx.restore();
}

function applyBevel(target, value = 0.4) {
  if (!target.ctx || !target.canvas) {
    if (target.element?.style) {
      const size = Math.max(1, value * 4);
      target.element.style.boxShadow = `inset ${size}px ${size}px ${size * 2}px rgba(0,0,0,0.35), inset -${size}px -${size}px ${size * 2}px rgba(255,255,255,0.4)`;
    }
    return;
  }
  applyConvolution(target, kernels.bevelLight, value, 0);
  target.ctx.save();
  target.ctx.globalCompositeOperation = 'soft-light';
  target.ctx.fillStyle = `rgba(255,255,255,${0.25 * value})`;
  target.ctx.fillRect(0, 0, target.canvas.width, target.canvas.height);
  target.ctx.restore();
}

export function applyFilter(layer, effectName, value = 1) {
  const target = resolveTarget(layer);
  const state = ensureState(layer);

  switch (effectName) {
    case 'brightness':
      state.brightness = value;
      break;
    case 'contrast':
      state.contrast = value;
      break;
    case 'saturation':
      state.saturation = value;
      break;
    case 'hue rotation':
    case 'hue-rotation':
    case 'hue':
      state.hue = value;
      break;
    case 'blur':
      state.blur = value;
      break;
    case 'invert':
      state.invert = value;
      break;
    case 'grayscale':
      state.grayscale = value;
      break;
    case 'sepia':
      state.sepia = value;
      break;
    case 'sharpen':
      applyConvolution(target, kernels.sharpen, value, 0);
      break;
    case 'emboss':
      applyConvolution(target, kernels.emboss, value, 128 * value);
      break;
    case 'bevel':
      applyBevel(target, value);
      break;
    case 'vignette':
      applyVignette(target, value);
      break;
    case 'grain':
      applyGrain(target, value);
      break;
    case 'texture-pressure':
      applyTexturePressure(target, value);
      break;
    case 'scratchiness':
      applyScratchiness(target, value);
      break;
    case 'ink-weight':
      applyInkWeight(target, value);
      break;
    default:
      console.warn(`Unknown effect: ${effectName}`);
  }

  return updateCssFilters(target, state);
}

export function resetFilters(layer) {
  if (!layer) return;
  layer.__filterState = { ...DEFAULT_FILTERS };
  const target = resolveTarget(layer);
  updateCssFilters(target, layer.__filterState);
}
