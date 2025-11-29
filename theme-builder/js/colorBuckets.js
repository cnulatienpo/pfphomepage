const palette = [
  { name: 'Safety Yellow', value: '#ffce00' },
  { name: 'Playful Red', value: '#ff5757' },
  { name: 'Builder Blue', value: '#2b7de9' },
  { name: 'Grass Green', value: '#4ade80' },
  { name: 'Night Navy', value: '#0f172a' },
  { name: 'Panel Blue', value: '#0b1b33' },
];

export function renderColorBuckets(container, onSelect) {
  container.innerHTML = '';
  palette.forEach((bucket) => {
    const chip = document.createElement('div');
    chip.className = 'color-chip';
    chip.style.background = bucket.value;
    chip.innerHTML = `<span>${bucket.name}</span>`;
    chip.addEventListener('click', () => onSelect(bucket));
    container.appendChild(chip);
  });
}
