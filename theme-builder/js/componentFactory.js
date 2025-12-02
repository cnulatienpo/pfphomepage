import { loadAssets } from './assetScanner.js';

const FALLBACK_COMPONENTS = [
  { selector: '.construction-component.cta-brick.fx-brutal-shadow', name: 'CTA Brick' },
  { selector: '.construction-component.info-plate.fx-bevel', name: 'Info Plate' },
  { selector: '.construction-component.nav-pegboard.fx-dotted', name: 'Pegboard Nav' },
  { selector: '.construction-component.warning-chip.fx-emboss', name: 'Warning Chip' },
];

const friendlyName = (selector) =>
  selector
    .replace(/::?[a-z-]+/giu, '')
    .replace(/[#.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b([a-z])/giu, (m, char) => char.toUpperCase()) || 'Construction Component';

function selectorToClasses(selector) {
  return selector
    .split(/\s+/u)
    .flatMap((piece) => piece.split('.'))
    .map((part) => part.replace(/[^a-z0-9_-]/giu, ''))
    .filter(Boolean)
    .filter((cls) => cls !== 'construction-component');
}

function componentFromRule(entry, index) {
  const name = friendlyName(entry.selector || entry.name || `Component ${index + 1}`);
  const classes = selectorToClasses(entry.selector || '');
  const id = `${classes.join('-') || name.toLowerCase().replace(/\s+/g, '-')}-${index}`;
  const accent = entry.meta?.colors?.[0]?.value || '#ffce00';
  const outline = entry.meta?.borders?.[0]?.value || '4px solid #102449';

  return {
    id,
    name,
    selector: entry.selector,
    source: entry.path,
    classes,
    accent,
    outline,
    meta: entry.meta || {},
  };
}

function inlineBadge(component) {
  const safeLabel = component.name.slice(0, 22);
  const svg = `<svg width="72" height="72" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="64" height="64" rx="14" fill="${component.accent}" stroke="#0f172a" stroke-width="4"/><circle cx="24" cy="24" r="6" fill="#0f172a"/><circle cx="48" cy="24" r="6" fill="#0f172a"/><rect x="18" y="36" width="36" height="12" rx="6" fill="#0f172a"/><text x="50%" y="90%" text-anchor="middle" font-family="Inter, sans-serif" font-size="10" font-weight="800" fill="#0f172a">${safeLabel}</text></svg>`;
  return svg;
}

function buildPreview(component) {
  const wrapper = document.createElement('div');
  wrapper.className = 'component-preview';

  const block = document.createElement('div');
  block.className = `construction-component ${component.classes.join(' ')}`.trim();
  block.style.display = 'grid';
  block.style.placeItems = 'center';
  block.style.padding = '14px';
  block.style.borderRadius = '18px';
  block.style.border = component.outline;
  block.style.background = `linear-gradient(135deg, ${component.accent}, #ff5757)`;
  block.style.color = '#0f172a';
  block.style.fontWeight = '800';
  block.style.letterSpacing = '0.05em';
  block.textContent = component.name;

  const badge = document.createElement('div');
  badge.className = 'component-badge';
  badge.innerHTML = inlineBadge(component);

  wrapper.append(block, badge);
  return wrapper;
}

function layerPayload(component) {
  const className = ['construction-component', ...component.classes].join(' ').trim();
  return {
    type: 'component',
    name: component.name,
    classes: component.classes,
    className,
    markup: `<div class="${className}"></div>`,
    placeholder: true,
  };
}

export async function listComponents() {
  try {
    const assets = await loadAssets();
    const componentRules = assets.filter((entry) => entry.category === 'components' && (entry.selector || entry.name));
    if (componentRules.length) {
      return componentRules.map((entry, index) => componentFromRule(entry, index));
    }
  } catch (error) {
    console.info('Component scan failed, falling back to presets.', error.message);
  }

  return FALLBACK_COMPONENTS.map((entry, index) => componentFromRule(entry, index));
}

export async function renderComponents(container, onAdd) {
  container.innerHTML = '<div class="component-card loading">Loading construction components…</div>';
  const components = await listComponents();
  container.innerHTML = '';

  components.forEach((component) => {
    const card = document.createElement('div');
    card.className = 'component-card';
    card.draggable = true;
    card.title = component.selector || component.name;

    const preview = buildPreview(component);
    const title = document.createElement('div');
    title.className = 'label';
    title.textContent = component.name;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = component.classes.length
      ? component.classes.map((cls) => `.${cls}`).join(' ')
      : 'construction-component';

    card.append(preview, title, meta);

    const payload = layerPayload(component);
    card.addEventListener('click', () => onAdd(payload));
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', JSON.stringify(payload));
      event.dataTransfer.effectAllowed = 'copy';
    });

    container.appendChild(card);
  });
}
