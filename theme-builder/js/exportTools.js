const FALLBACK_THEME = {
  palette: ['#0b2144', '#0f172a', '#ffce00', '#ff5757', '#2b7de9', '#4ade80'],
  typography: {
    heading: '"Plus Jakarta Sans", Inter, system-ui',
    body: 'Inter, system-ui',
  },
  spacingScale: [4, 8, 12, 16, 24, 32],
  radiusScale: [8, 12, 16, 24],
};

export async function exportPNG(canvasElement) {
  const dataUrl = await rasterizeCanvas(canvasElement);
  triggerDownload(dataUrl, 'construction-theme.png');
}

export function exportJSON(canvasState) {
  const data = JSON.stringify(canvasState, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  triggerBlobDownload(blob, 'construction-theme.json');
}

export function exportPureDataMappings() {
  return serializeMappings();
}

export function exportToHTML(layerManager, touchDesigner = null) {
  const tdBlob = touchDesigner
    ? `<script type="application/json" id="touchdesigner-config">${JSON.stringify(touchDesigner)}</script>`
    : '';
  const html = `<!DOCTYPE html><html><head><style>${runtimeCSS()}</style></head><body>${layerManager.layers
    .map(
      (layer) =>
        `<div class="layer" style="width:${layer.width}px;height:${layer.height}px;transform:translate(${layer.x}px,${layer.y}px) rotate(${layer.transform.rotation}deg) scale(${layer.transform.scale});mix-blend-mode:${layer.blendMode};opacity:${layer.filter.opacity / 100}">${
          layer.markup || `<div class=\"placeholder\">${layer.name}</div>`
        }</div>`,
    )
    .join('')}</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  triggerBlobDownload(blob, 'construction-theme.html');
}

export function exportCSS(themeState = {}) {
  const css = buildThemeStyles(themeState);
  const blob = new Blob([css], { type: 'text/css' });
  triggerBlobDownload(blob, 'construction-theme.css');
}

export function exportWordPress(canvasState) {
  const themeState = normalizeThemeState(canvasState?.theme ?? {});
  const themeName = canvasState?.meta?.name || 'Construction Play Theme';
  const slug = sanitizeFileName(themeName.toLowerCase().replace(/\s+/g, '-')) || 'construction-play';
  const files = buildWordPressFiles(themeName, slug, canvasState, themeState);
  const zip = buildZip(files);
  triggerBlobDownload(zip, `${slug}.zip`, 'application/zip');
}

async function rasterizeCanvas(canvasElement) {
  if (!canvasElement) throw new Error('Canvas element is required for PNG export');

  if (typeof html2canvas === 'function') {
    const rendered = await html2canvas(canvasElement, {
      useCORS: true,
      backgroundColor: null,
    });
    return rendered.toDataURL('image/png');
  }

  if (typeof canvasElement.toDataURL === 'function') {
    return canvasElement.toDataURL('image/png');
  }

  const temp = document.createElement('canvas');
  temp.width = canvasElement.clientWidth || 1200;
  temp.height = canvasElement.clientHeight || 900;
  const ctx = temp.getContext('2d');
  ctx.fillStyle = '#0b2144';
  ctx.fillRect(0, 0, temp.width, temp.height);
  return temp.toDataURL('image/png');
}

function buildHtmlDocument(canvasState) {
  const layers = canvasState?.layers || [];
  const theme = normalizeThemeState(canvasState?.theme ?? {});
  const layerMarkup = layers
    .filter((layer) => layer.visible !== false)
    .map((layer) => renderLayer(layer))
    .join('');

  const css = `:root{${theme.palette
    .map((color, index) => `--color-${index + 1}: ${color};`)
    .join('')}--font-heading:${theme.typography.heading};--font-body:${theme.typography.body};}
body{margin:0;min-height:100vh;background:${theme.palette[0]};font-family:${theme.typography.body};color:${
    theme.palette[2] || '#ffce00'
  };}
.design-surface{position:relative;min-height:100vh;overflow:hidden;background:radial-gradient(circle at 20% 20%, ${
    theme.palette[2] || '#ffce00'
  }11%, transparent 40%), linear-gradient(135deg, ${theme.palette[0]}, ${theme.palette[1]});}
.layer{position:absolute;box-shadow:0 20px 50px rgba(0,0,0,0.25);transform-origin:top left;}
.layer .placeholder{display:grid;place-items:center;height:100%;width:100%;background:linear-gradient(135deg, ${
    theme.palette[2] || '#ffce00'
  }, ${theme.palette[3] || '#ff5757'});color:${theme.palette[0]};font-family:${theme.typography.heading};font-weight:800;text-transform:uppercase;letter-spacing:0.08em;}
`;

  return `<!doctype html><html><head><meta charset="utf-8"/><title>Construction Theme Export</title><style>${css}</style></head><body><div class="design-surface">${layerMarkup}</div></body></html>`;
}

function renderLayer(layer) {
  const transform = `translate(${layer.x + (layer.transform?.x || 0)}px, ${
    layer.y + (layer.transform?.y || 0)
  }px) rotate(${layer.transform?.rotation || 0}deg) scale(${layer.transform?.scale || 1})`;
  const filters = buildFilterString(layer.filter);
  const opacity = (layer.filter?.opacity ?? 100) / 100;
  const background = layer.src ? `background-image:url(${layer.src});background-size:cover;` : '';
  return `<div class="layer" style="left:0;top:0;width:${layer.width}px;height:${layer.height}px;transform:${transform};mix-blend-mode:${
    layer.blendMode || 'source-over'
  };filter:${filters};opacity:${opacity}"><div class="placeholder" style="${background}">${layer.name || 'Layer'}</div></div>`;
}

function buildFilterString(filter = {}) {
  const { brightness = 100, contrast = 100, saturation = 100, hue = 0, blur = 0 } = filter;
  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg) blur(${blur}px)`;
}

function buildThemeStyles(themeState = {}) {
  const theme = normalizeThemeState(themeState);
  const spacing = theme.spacingScale.map((step, i) => `  --space-${i}: ${step}px;`).join('\n');
  const radii = theme.radiusScale.map((step, i) => `  --radius-${i}: ${step}px;`).join('\n');
  const palette = theme.palette.map((color, i) => `  --color-${i}: ${color};`).join('\n');

  return `:root {\n${palette}\n${spacing}\n${radii}\n  --font-heading: ${theme.typography.heading};\n  --font-body: ${theme.typography.body};\n}\n\nbody {\n  margin: 0;\n  background: linear-gradient(180deg, var(--color-0), var(--color-1));\n  color: var(--color-2);\n  font-family: var(--font-body);\n}\n\n.h1, h1 {\n  font-family: var(--font-heading);\n  font-size: clamp(2.5rem, 5vw, 3.5rem);\n  letter-spacing: 0.08em;\n}\n\n.btn-primary {\n  background: var(--color-2);\n  color: var(--color-0);\n  border-radius: var(--radius-2);\n  padding: var(--space-2) var(--space-4);\n  border: none;\n  box-shadow: 0 12px 30px rgba(0,0,0,0.25);\n}\n\n.card {\n  background: rgba(255,255,255,0.04);\n  border: 1px solid rgba(255,255,255,0.1);\n  border-radius: var(--radius-3);\n  padding: var(--space-4);\n  backdrop-filter: blur(10px);\n}\n`;
}

function normalizeThemeState(themeState) {
  return {
    palette: themeState.palette?.length ? themeState.palette : FALLBACK_THEME.palette,
    typography: {
      heading: themeState.typography?.heading || FALLBACK_THEME.typography.heading,
      body: themeState.typography?.body || FALLBACK_THEME.typography.body,
    },
    spacingScale: themeState.spacingScale?.length ? themeState.spacingScale : FALLBACK_THEME.spacingScale,
    radiusScale: themeState.radiusScale?.length ? themeState.radiusScale : FALLBACK_THEME.radiusScale,
  };
}

function buildWordPressFiles(themeName, slug, canvasState, themeState) {
  const description = canvasState?.meta?.description || 'Generated from the Construction Play theme builder.';
  const themeCSS = buildThemeStyles(themeState);
  const html = buildHtmlDocument(canvasState);

  const styleCss = `/*\nTheme Name: ${themeName}\nTheme URI: https://example.com/${slug}\nDescription: ${description}\nVersion: 1.0.0\nAuthor: Construction Crew\n*/\n@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;600&display=swap');\n\n${themeCSS}`;

  const indexPhp = `<?php get_header(); ?>\n<main class="site-main">\n  <section class="hero">\n    <h1><?php echo get_bloginfo('name'); ?></h1>\n    <p><?php echo get_bloginfo('description'); ?></p>\n  </section>\n  <section class="canvas-export">\n    ${html}\n  </section>\n</main>\n<?php get_footer(); ?>`;

  const functionsPhp = `<?php\nadd_action('wp_enqueue_scripts', function() {\n  wp_enqueue_style('${slug}', get_stylesheet_uri(), [], '1.0.0');\n});\n?>`;

  const template = `<?php /* Template Name: Builder Canvas */ ?>\n<?php get_header(); ?>\n<div class="builder-canvas">${html}</div>\n<?php get_footer(); ?>`;

  const readme = `# ${themeName}\n\nGenerated entirely in the browser. The bundled HTML snapshot lives inside the template and index files. Replace that markup with your dynamic loop if desired.`;

  return [
    { path: `${slug}/style.css`, content: styleCss },
    { path: `${slug}/index.php`, content: indexPhp },
    { path: `${slug}/functions.php`, content: functionsPhp },
    { path: `${slug}/page-builder-canvas.php`, content: template },
    { path: `${slug}/README.md`, content: readme },
  ];
}

function buildZip(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const directory = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.path);
    const dataBytes = typeof file.content === 'string' ? encoder.encode(file.content) : new Uint8Array(file.content);
    const crc = crc32(dataBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, dataBytes.length, true);
    localView.setUint32(22, dataBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);

    parts.push(localHeader, nameBytes, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, dataBytes.length, true);
    centralView.setUint32(24, dataBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    directory.push({ header: centralHeader, nameBytes, offset });

    offset += localHeader.length + nameBytes.length + dataBytes.length;
  });

  const directoryOffset = offset;
  directory.forEach((entry) => {
    parts.push(entry.header, entry.nameBytes);
    offset += entry.header.length + entry.nameBytes.length;
  });

  const footer = new Uint8Array(22);
  const footerView = new DataView(footer.buffer);
  footerView.setUint32(0, 0x06054b50, true);
  footerView.setUint16(4, 0, true);
  footerView.setUint16(6, 0, true);
  footerView.setUint16(8, files.length, true);
  footerView.setUint16(10, files.length, true);
  footerView.setUint32(12, offset - directoryOffset, true);
  footerView.setUint32(16, directoryOffset, true);
  footerView.setUint16(20, 0, true);

  const blob = new Blob([...parts, footer], { type: 'application/zip' });
  return blob;
}

function crc32(bytes) {
  let crc = ~0;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return ~crc >>> 0;
}

function sanitizeFileName(name) {
  return (name || 'construction-play').replace(/[^a-z0-9\-]+/gi, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
}

function triggerDownload(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function triggerBlobDownload(blob, filename, type = blob.type) {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}
