export function exportToJSON(layerManager) {
  const data = JSON.stringify(layerManager.serialize(), null, 2);
  downloadText(data, 'theme-builder-project.json');
}

export function exportToPNG(canvas) {
  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = 'theme-layout.png';
  link.click();
}

export function exportToHTML(layerManager) {
  const { html, css, assetMap } = generateHTML(layoutFromLayers(layerManager.layers));
  downloadText(html, 'index.html');
  downloadText(css, 'theme.css');
  downloadText(JSON.stringify(assetMap, null, 2), 'asset-map.json');
}

function layoutFromLayers(layers) {
  return layers.map((layer) => ({
    ...layer,
    filter: layer.filter,
    transform: layer.transform,
  }));
}

function generateHTML(layers) {
  const assetMap = {};
  const body = layers
    .map((layer) => {
      const style = [
        `position:absolute`,
        `left:${layer.x}px`,
        `top:${layer.y}px`,
        `width:${layer.width}px`,
        `height:${layer.height}px`,
        `opacity:${layer.opacity}`,
        `transform: skew(${layer.transform.skewX}deg, ${layer.transform.skewY}deg) rotate(${layer.transform.rotation}deg) scale(${layer.transform.scaleX * (layer.transform.flipX ? -1 : 1)}, ${layer.transform.scaleY * (layer.transform.flipY ? -1 : 1)})`,
        `mix-blend-mode:${layer.blendMode}`,
        `filter:${layer.visible ? cssFilter(layer.filter) : 'none'}`,
        `display:${layer.visible ? 'block' : 'none'}`,
      ].join(';');

      if (layer.type === 'image') {
        assetMap[layer.name] = layer.src;
        return `<img src="${layer.src}" alt="${layer.name}" style="${style}" data-layer="${layer.id}" />`;
      }
      if (layer.type === 'text') {
        return `<div style="${style}" data-layer="${layer.id}" class="text-layer">${layer.content}</div>`;
      }
      return `<div style="${style}" class="${layer.classes.join(' ')}" data-layer="${layer.id}">${layer.name}</div>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="theme.css" />
  <title>Exported Construction Theme</title>
</head>
<body>
  <div class="theme-stage">${body}</div>
</body>
</html>`;

  const css = `.theme-stage { position: relative; width: 1200px; height: 720px; background: #0f172a; overflow: hidden; }
.text-layer { color: #f8fafc; font-family: 'Inter', sans-serif; }
`;

  return { html, css, assetMap };
}

function cssFilter(filter) {
  return [
    `brightness(${filter.brightness}%)`,
    `contrast(${filter.contrast}%)`,
    `saturate(${filter.saturation}%)`,
    `hue-rotate(${filter.hue}deg)`,
    `blur(${filter.blur}px)`,
    `grayscale(${filter.grayscale}%)`,
    `sepia(${filter.sepia}%)`,
    `invert(${filter.invert}%)`,
  ].join(' ');
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
