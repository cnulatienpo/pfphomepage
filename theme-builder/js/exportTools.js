export function exportToPNG(canvas) {
  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = 'construction-theme.png';
  link.click();
}

export function exportToJSON(layerManager, touchDesigner = null) {
  const payload = {
    ...layerManager.serialize(),
    ...(touchDesigner ? { touchDesigner } : {}),
  };
  const data = JSON.stringify(payload, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'construction-theme.json';
  link.click();
}

export function exportToHTML(layerManager, touchDesigner = null) {
  const tdBlob = touchDesigner
    ? `<script type="application/json" id="touchdesigner-config">${JSON.stringify(touchDesigner)}</script>`
    : '';
  const html = `<!DOCTYPE html><html><head><style>${runtimeCSS()}</style></head><body>${layerManager.layers
    .map((layer) => `<div class="layer" style="width:${layer.width}px;height:${layer.height}px;transform:translate(${layer.x}px,${layer.y}px) rotate(${layer.transform.rotation}deg) scale(${layer.transform.scale});mix-blend-mode:${layer.blendMode};opacity:${layer.filter.opacity / 100}"><div class="placeholder">${layer.name}</div></div>`)
    .join('')}${tdBlob}<script>try{const td=JSON.parse(document.getElementById('touchdesigner-config')?.textContent||'{}');console.log('TouchDesigner config',td);}catch(e){console.warn('No TouchDesigner config',e);}</script></body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'construction-theme.html';
  link.click();
}

function runtimeCSS() {
  return `.layer{position:absolute;border:3px solid #123055;border-radius:16px;overflow:hidden;background:linear-gradient(135deg,#ffce00,#ff5757);box-shadow:0 10px 20px rgba(0,0,0,0.25);}body{background:#0b2144;min-height:100vh;position:relative;font-family:Inter,sans-serif;margin:0;padding:20px;} .placeholder{display:grid;place-items:center;height:100%;color:#0f172a;font-weight:900;letter-spacing:0.05em;text-transform:uppercase;}`;
}
