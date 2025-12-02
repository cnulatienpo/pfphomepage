import { filterDefs } from './filters.js';
import { behaviorStickers } from './behaviors.js';

export function renderInspector(container, layerManager) {
  container.innerHTML = '';
  const active = layerManager.layers.find((l) => l.id === layerManager.activeId);

  if (!active) {
    container.textContent = 'Select a layer to inspect its visual tokens.';
    return;
  }

  const tokens = ensureTokenDefaults(active, layerManager);
  const sectioned = document.createDocumentFragment();

  sectioned.append(
    headerBlock(active),
    tokenGroup('Color tiles', buildColorTiles(tokens.color, (color) => updateTokens(layerManager, active, { color }))),
    tokenGroup('Typography tiles', buildTypeTiles(tokens.type, (type) => updateTokens(layerManager, active, { type }))),
    tokenGroup('Spacing pegs', buildSpacingPegs(tokens.spacing, (spacing) => updateTokens(layerManager, active, { spacing }))),
    tokenGroup('Borders', buildBorderTiles(tokens.border, (border) => updateTokens(layerManager, active, { border }))),
    tokenGroup(
      'Behaviors',
      buildBehaviorBadges(tokens.behavior, (behavior) => {
        updateTokens(layerManager, active, { behavior });
        layerManager.updateLayer(active.id, { sticker: behavior === 'static' ? null : behavior });
      }),
    ),
    tokenGroup('Effects', buildEffects(active, layerManager)),
    tokenGroup('Component preview', [componentPreview(active, tokens)]),
  );

  container.appendChild(sectioned);
}

function ensureTokenDefaults(layer, layerManager) {
  if (!layer.tokens) {
    const defaults = {
      color: 'primary',
      type: 'title',
      spacing: 'm',
      border: 'soft',
      behavior: layer.sticker || 'static',
      previewTone: 'frosted',
    };
    layerManager.updateLayer(layer.id, { tokens: defaults });
    return defaults;
  }
  return {
    color: layer.tokens.color || 'primary',
    type: layer.tokens.type || 'title',
    spacing: layer.tokens.spacing || 'm',
    border: layer.tokens.border || 'soft',
    behavior: layer.tokens.behavior || layer.sticker || 'static',
    previewTone: layer.tokens.previewTone || 'frosted',
  };
}

function headerBlock(layer) {
  const wrap = document.createElement('div');
  wrap.style.display = 'grid';
  wrap.style.gridTemplateColumns = '1fr auto';
  wrap.style.alignItems = 'center';
  wrap.style.padding = '10px 12px';
  wrap.style.borderRadius = '14px';
  wrap.style.border = '1px solid #123055';
  wrap.style.background = 'linear-gradient(120deg, rgba(43,125,233,0.08), rgba(10,26,51,0.9))';

  const title = document.createElement('div');
  title.style.display = 'flex';
  title.style.flexDirection = 'column';
  title.style.gap = '4px';
  const name = document.createElement('strong');
  name.textContent = layer.name;
  const meta = document.createElement('span');
  meta.style.fontSize = '12px';
  meta.style.color = '#9fb4d3';
  meta.textContent = `${Math.round(layer.width)}×${Math.round(layer.height)} · ${layer.blendMode}`;
  title.append(name, meta);

  const chip = document.createElement('div');
  chip.textContent = layer.visible ? 'Visible' : 'Hidden';
  chip.style.padding = '6px 10px';
  chip.style.borderRadius = '999px';
  chip.style.border = '1px dashed #123055';
  chip.style.background = layer.visible ? 'rgba(74,222,128,0.12)' : 'rgba(255,87,87,0.12)';
  chip.style.color = layer.visible ? '#4ade80' : '#ff5757';
  wrap.append(title, chip);
  return wrap;
}

function tokenGroup(title, content) {
  const group = document.createElement('section');
  group.style.display = 'flex';
  group.style.flexDirection = 'column';
  group.style.gap = '8px';

  const heading = document.createElement('h4');
  heading.textContent = title;
  heading.style.margin = '4px 0 0';
  heading.style.fontSize = '13px';
  heading.style.color = '#d7e5ff';

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(120px, 1fr))';
  grid.style.gap = '8px';

  (Array.isArray(content) ? content : [content]).forEach((node) => grid.appendChild(node));

  group.append(heading, grid);
  return group;
}

function buildColorTiles(selected, onSelect) {
  const palette = [
    { id: 'primary', label: 'Primary', value: '#2b7de9', accent: '#7cb3ff' },
    { id: 'accent', label: 'Accent', value: '#ffce00', accent: '#ffd447' },
    { id: 'calm', label: 'Calm', value: '#4ade80', accent: '#9ef5b6' },
    { id: 'ink', label: 'Ink', value: '#0f172a', accent: '#1f2f4a' },
  ];

  return palette.map((swatch) => {
    const tile = baseTile(selected === swatch.id);
    tile.style.background = `linear-gradient(150deg, ${swatch.value}, ${swatch.accent})`;
    tile.style.color = '#0b1222';
    tile.innerHTML = `<div style="font-weight:800">${swatch.label}</div><small style="color:#0b1222bb">${swatch.value}</small>`;
    tile.addEventListener('click', () => onSelect(swatch.id));
    return tile;
  });
}

function buildTypeTiles(selected, onSelect) {
  const styles = [
    { id: 'display', label: 'Display', size: 28, weight: 800, tracking: '0.02em' },
    { id: 'title', label: 'Title', size: 20, weight: 700, tracking: '0.01em' },
    { id: 'body', label: 'Body', size: 15, weight: 500, tracking: '0em' },
    { id: 'mono', label: 'Mono', size: 13, weight: 600, tracking: '0.06em', font: '"DM Mono", monospace' },
  ];

  return styles.map((type) => {
    const tile = baseTile(selected === type.id);
    tile.style.alignItems = 'flex-start';
    tile.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(11,27,51,0.7))';

    const sample = document.createElement('div');
    sample.textContent = 'Aa';
    sample.style.fontSize = `${type.size}px`;
    sample.style.fontWeight = type.weight;
    sample.style.letterSpacing = type.tracking;
    if (type.font) sample.style.fontFamily = type.font;

    const meta = document.createElement('div');
    meta.style.fontSize = '12px';
    meta.style.color = '#9fb4d3';
    meta.textContent = `${type.label} · ${type.size}px / ${type.weight}`;

    tile.append(sample, meta);
    tile.addEventListener('click', () => onSelect(type.id));
    return tile;
  });
}

function buildSpacingPegs(selected, onSelect) {
  const pegs = [
    { id: 'xs', label: 'Compact', value: 4 },
    { id: 's', label: 'Tight', value: 8 },
    { id: 'm', label: 'Comfort', value: 12 },
    { id: 'l', label: 'Roomy', value: 20 },
  ];

  return pegs.map((peg) => {
    const tile = baseTile(selected === peg.id);
    tile.style.background = '#0b1b33';
    tile.style.borderStyle = 'dashed';

    const pegSvg = spacingPegSVG(peg.value, selected === peg.id);
    tile.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;width:100%">${pegSvg}<div style="font-size:12px;color:#9fb4d3">${peg.label}</div></div>`;
    tile.addEventListener('click', () => onSelect(peg.id));
    return tile;
  });
}

function spacingPegSVG(value, active) {
  const tone = active ? '#ffce00' : '#2b7de9';
  return `
    <svg width="80" height="28" viewBox="0 0 80 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="4" y="6" width="72" height="16" rx="8" fill="rgba(18,48,85,0.6)" stroke="${tone}" stroke-width="1.6" stroke-dasharray="6 4"/>
      <line x1="20" y1="14" x2="60" y2="14" stroke="${tone}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="20" cy="14" r="3" fill="#0f172a" stroke="${tone}" stroke-width="1.4"/>
      <circle cx="60" cy="14" r="3" fill="#0f172a" stroke="${tone}" stroke-width="1.4"/>
      <text x="40" y="18" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" fill="#f8fafc">${value}px</text>
    </svg>`;
}

function buildBorderTiles(selected, onSelect) {
  const borders = [
    { id: 'soft', label: 'Soft radius', border: '1px solid #2b7de9', radius: 14 },
    { id: 'outlined', label: 'Outlined', border: '2px dashed #ffce00', radius: 10 },
    { id: 'pill', label: 'Pill', border: '1px solid #9fb4d3', radius: 999 },
    { id: 'sharp', label: 'Sharp', border: '2px solid #1d355e', radius: 4 },
  ];

  return borders.map((edge) => {
    const tile = baseTile(selected === edge.id);
    tile.style.background = 'linear-gradient(120deg, rgba(43,125,233,0.08), rgba(0,0,0,0.25))';
    tile.style.position = 'relative';

    const shape = document.createElement('div');
    shape.style.height = '44px';
    shape.style.width = '100%';
    shape.style.border = edge.border;
    shape.style.borderRadius = `${edge.radius}px`;
    shape.style.background = 'rgba(11,27,51,0.5)';
    shape.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.08)';

    const label = document.createElement('div');
    label.style.fontSize = '12px';
    label.style.color = '#9fb4d3';
    label.textContent = edge.label;

    tile.append(shape, label);
    tile.addEventListener('click', () => onSelect(edge.id));
    return tile;
  });
}

function buildBehaviorBadges(selected, onSelect) {
  const entries = [{ id: 'static', name: 'Static', desc: 'No motion', badge: neutralBadge() }, ...behaviorStickers];

  return entries.map((item) => {
    const tile = baseTile(selected === item.id);
    tile.style.background = 'linear-gradient(160deg, rgba(255,255,255,0.04), rgba(43,125,233,0.06))';
    tile.style.gap = '6px';
    tile.style.alignItems = 'center';

    const badge = document.createElement('div');
    badge.style.display = 'inline-flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.width = '44px';
    badge.style.height = '44px';
    badge.style.borderRadius = '12px';
    badge.style.border = '1px solid #123055';
    badge.style.background = 'rgba(11,27,51,0.7)';
    badge.innerHTML = item.badge;

    const meta = document.createElement('div');
    meta.style.display = 'flex';
    meta.style.flexDirection = 'column';
    meta.innerHTML = `<strong style="font-size:13px">${item.name}</strong><span style="font-size:12px;color:#9fb4d3">${item.desc}</span>`;

    tile.append(badge, meta);
    tile.addEventListener('click', () => onSelect(item.id));
    return tile;
  });
}

function buildEffects(active, layerManager) {
  const sliderGrid = document.createElement('div');
  sliderGrid.style.display = 'grid';
  sliderGrid.style.gridTemplateColumns = '1fr';
  sliderGrid.style.gap = '6px';

  filterDefs.forEach((def) => {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr 70px';
    row.style.alignItems = 'center';
    row.style.padding = '8px 10px';
    row.style.border = '1px solid #123055';
    row.style.borderRadius = '12px';
    row.style.background = 'rgba(11,27,51,0.7)';

    const label = document.createElement('label');
    label.textContent = def.label;
    label.style.fontSize = '13px';

    const input = document.createElement('input');
    input.type = 'range';
    input.min = def.min;
    input.max = def.max;
    input.step = def.step;
    input.value = active.filter[def.key];
    input.addEventListener('input', (e) => {
      const value = Number(e.target.value);
      layerManager.updateLayer(active.id, { filter: { ...active.filter, [def.key]: value } });
    });

    row.append(label, input);
    sliderGrid.appendChild(row);
  });

  return [sliderGrid];
}

function componentPreview(layer, tokens) {
  const card = baseTile(false);
  card.style.borderStyle = 'dashed';
  card.style.background = 'linear-gradient(180deg, rgba(255,206,0,0.06), rgba(11,27,51,0.9))';
  card.style.alignItems = 'flex-start';
  card.style.gap = '10px';

  const header = document.createElement('div');
  header.textContent = 'Preview';
  header.style.fontWeight = '700';
  header.style.fontSize = '13px';

  const preview = document.createElement('div');
  preview.style.width = '100%';
  preview.style.height = '72px';
  preview.style.borderRadius = tokens.border === 'pill' ? '999px' : tokens.border === 'soft' ? '12px' : tokens.border === 'sharp' ? '4px' : '10px';
  preview.style.border = '1px solid #123055';
  preview.style.background = tokens.color === 'accent'
    ? 'linear-gradient(120deg, #ffce00, #ffd447)'
    : tokens.color === 'calm'
      ? 'linear-gradient(120deg, #4ade80, #86efac)'
      : tokens.color === 'ink'
        ? 'linear-gradient(120deg, #0f172a, #1f2f4a)'
        : 'linear-gradient(120deg, #2b7de9, #7cb3ff)';
  preview.style.boxShadow = '0 8px 30px rgba(0,0,0,0.35)';
  preview.style.position = 'relative';

  const label = document.createElement('div');
  label.style.position = 'absolute';
  label.style.bottom = '8px';
  label.style.right = '10px';
  label.style.fontSize = '11px';
  label.style.color = '#0f172a';
  label.style.background = 'rgba(255,255,255,0.7)';
  label.style.padding = '4px 8px';
  label.style.borderRadius = '10px';
  label.textContent = `${Math.round(layer.width)}×${Math.round(layer.height)}`;
  preview.appendChild(label);

  const detail = document.createElement('div');
  detail.style.display = 'flex';
  detail.style.justifyContent = 'space-between';
  detail.style.width = '100%';
  detail.style.fontSize = '12px';
  detail.style.color = '#9fb4d3';
  detail.innerHTML = `<span>${tokens.type.toUpperCase()} · ${tokens.spacing.toUpperCase()}</span><span>${layer.blendMode}</span>`;

  card.append(header, preview, detail);
  return card;
}

function baseTile(active) {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.style.display = 'flex';
  tile.style.flexDirection = 'column';
  tile.style.alignItems = 'center';
  tile.style.justifyContent = 'center';
  tile.style.gap = '4px';
  tile.style.padding = '10px';
  tile.style.borderRadius = '14px';
  tile.style.border = `2px solid ${active ? '#ffce00' : '#123055'}`;
  tile.style.cursor = 'pointer';
  tile.style.color = '#f8fafc';
  tile.style.background = 'rgba(11,27,51,0.8)';
  tile.style.boxShadow = active ? '0 6px 18px rgba(255,206,0,0.25)' : 'inset 0 1px 0 rgba(255,255,255,0.06)';
  return tile;
}

function neutralBadge() {
  return `
    <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="24" height="24" rx="8" fill="#0b1b33" stroke="#9fb4d3" stroke-width="2"/>
      <path d="M8 14h12" stroke="#9fb4d3" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`;
}

function updateTokens(layerManager, layer, patch) {
  const updated = { ...layer.tokens, ...patch };
  layerManager.updateLayer(layer.id, { tokens: updated });
}
