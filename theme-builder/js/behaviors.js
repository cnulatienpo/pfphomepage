import { placeholderBadge } from './assetScanner.js';

export const behaviorStickers = [
  { id: 'wiggle', name: 'Wiggle', desc: 'Applies playful oscillation', badge: placeholderBadge('W', '#ffce00') },
  { id: 'pulse', name: 'Pulse', desc: 'Grows and shrinks gently', badge: placeholderBadge('P', '#4ade80') },
  { id: 'shine', name: 'Shine', desc: 'Adds a reflective sweep', badge: placeholderBadge('S', '#2b7de9') },
  { id: 'bounce', name: 'Bounce', desc: 'Up/down toy bounce', badge: placeholderBadge('B', '#ff5757') },
];

export function renderBehaviorBadges(container, onSelect) {
  container.innerHTML = '';
  behaviorStickers.forEach((item) => {
    const tile = document.createElement('div');
    tile.className = 'badge-tile';
    tile.innerHTML = `<div class="badge">${svgToInline(item.badge)}<span>${item.name}</span></div><div class="hint">${item.desc}</div>`;
    tile.addEventListener('click', () => onSelect(item));
    container.appendChild(tile);
  });
}

function svgToInline(svg) {
  const encoded = btoa(svg);
  return `<img src="data:image/svg+xml;base64,${encoded}" alt="${svg}" width="24" height="24"/>`;
}
