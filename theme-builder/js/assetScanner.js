import { placeholderSVG } from './utils.js';

const fallbacks = [
  { name: 'Peg Grid', type: 'grids', src: placeholderSVG('GRID', ['#0b3b82', '#164e9b']) },
  { name: 'Marker Stroke', type: 'marks', src: placeholderSVG('MARK', ['#ffce00', '#ff5757']) },
  { name: 'Concrete Texture', type: 'textures', src: placeholderSVG('TEXTURE', ['#0f172a', '#1f2f4a']) },
  { name: 'Safety Stripe', type: 'patterns', src: placeholderSVG('PATTERN', ['#ff5757', '#ffce00']) },
];

export async function loadAssets() {
  try {
    const response = await fetch('./visual-assets/asset-map.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('map missing');
    const map = await response.json();
    const all = Object.values(map).flat();
    if (!all.length) throw new Error('empty map');
    return all;
  } catch (err) {
    console.info('Using placeholder assets until generate-assets.js is run.', err.message);
    return fallbacks.map((asset, index) => ({ ...asset, id: `ph-${index}` }));
  }
}

export function placeholderBadge(label, color) {
  return `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="36" height="36" rx="10" fill="${color}" stroke="white" stroke-width="3"/><text x="50%" y="54%" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="800" fill="#0f172a">${label}</text></svg>`;
}
