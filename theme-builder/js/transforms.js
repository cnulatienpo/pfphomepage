export function applyTransforms(ctx, layer) {
  ctx.translate(layer.x + layer.transform.translateX, layer.y + layer.transform.translateY);
  ctx.transform(1, Math.tan((layer.transform.skewY * Math.PI) / 180), Math.tan((layer.transform.skewX * Math.PI) / 180), 1, 0, 0);
  ctx.rotate((layer.transform.rotation * Math.PI) / 180);
  const scaleX = layer.transform.scaleX * (layer.transform.flipX ? -1 : 1);
  const scaleY = layer.transform.scaleY * (layer.transform.flipY ? -1 : 1);
  ctx.scale(scaleX, scaleY);
}

export function buildTransformControls(config) {
  const container = document.createElement('div');
  config.forEach((item) => {
    const label = document.createElement('label');
    label.textContent = item.label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = item.min;
    input.max = item.max;
    input.step = item.step;
    input.value = item.value;
    input.addEventListener('input', (e) => item.onChange(Number(e.target.value)));
    label.appendChild(input);
    container.appendChild(label);
  });
  return container;
}
