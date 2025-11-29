export function buildFilterString(filter) {
  const parts = [
    `brightness(${filter.brightness}%)`,
    `contrast(${filter.contrast}%)`,
    `saturate(${filter.saturation}%)`,
    `hue-rotate(${filter.hue}deg)`,
    `blur(${filter.blur}px)`,
    `grayscale(${filter.grayscale}%)`,
    `sepia(${filter.sepia}%)`,
    `invert(${filter.invert}%)`,
  ];
  return parts.join(' ');
}

export function applySharpen(ctx, layer) {
  if (!layer.filter.sharpen) return;
  const { width, height } = ctx.canvas;
  const input = ctx.getImageData(0, 0, width, height);
  const output = ctx.createImageData(width, height);
  const kernel = [0, -1, 0, -1, 5 + layer.filter.sharpen * 0.05, -1, 0, -1, 0];
  const divisor = kernel.reduce((sum) => sum, 0) || 1;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 4; c++) {
        const i = (y * width + x) * 4 + c;
        let acc = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pi = ((y + ky) * width + (x + kx)) * 4 + c;
            acc += input.data[pi] * kernel[ki++];
          }
        }
        output.data[i] = Math.min(255, Math.max(0, acc / divisor));
      }
    }
  }
  ctx.putImageData(output, 0, 0);
}

export function applySpecialFilters(ctx, layer, width, height) {
  if (layer.filter.shadow) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.filter = `blur(${4 + layer.filter.shadow / 3}px)`;
    ctx.fillStyle = `rgba(0,0,0,${0.25 + layer.filter.shadow / 200})`;
    ctx.fillRect(4, 6, width, height);
    ctx.restore();
  }

  if (layer.filter.glow) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = `blur(${6 + layer.filter.glow / 2}px)`;
    ctx.strokeStyle = `rgba(245, 158, 11, ${0.3 + layer.filter.glow / 200})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);
    ctx.restore();
  }

  if (layer.filter.inkWeight) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.lineWidth = 1 + layer.filter.inkWeight / 20;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeRect(0, 0, width, height);
    ctx.restore();
  }

  if (layer.filter.vignette) {
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) / 4,
      width / 2,
      height / 2,
      Math.max(width, height) / 1.2
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${layer.filter.vignette / 100})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  if (layer.filter.depth) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 16 + layer.filter.depth;
    ctx.shadowOffsetX = 6;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(255,255,255,0)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  if (layer.filter.texture) {
    const stripes = ctx.createLinearGradient(0, 0, width, height);
    stripes.addColorStop(0, `rgba(255,255,255,${0.04 * (layer.filter.texture / 50)})`);
    stripes.addColorStop(1, `rgba(0,0,0,${0.04 * (layer.filter.texture / 50)})`);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = stripes;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
  }

  if (layer.filter.scratchiness || layer.filter.noise) {
    const strength = (layer.filter.scratchiness + layer.filter.noise) / 2;
    const density = Math.max(12, Math.min(120, strength));
    ctx.save();
    ctx.globalAlpha = 0.04 + strength / 800;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < density; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const w = 1 + Math.random() * 3;
      const h = 10 + Math.random() * 30;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }
}
