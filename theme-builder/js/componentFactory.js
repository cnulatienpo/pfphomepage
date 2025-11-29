const componentPresets = [
  { id: 'cta', name: 'CTA Brick', desc: 'Rounded CTA with chunky shadow', preview: ['bar', 'tile'] },
  { id: 'card', name: 'Info Plate', desc: 'Panel with header/footer rails', preview: ['bar', 'bar', 'tile'] },
  { id: 'nav', name: 'Chunky Nav', desc: 'Peg-aligned navigation pills', preview: ['tile', 'bar'] },
];

export function renderComponents(container, onAdd) {
  container.innerHTML = '';
  componentPresets.forEach((preset) => {
    const card = document.createElement('div');
    card.className = 'component-card';
    const preview = document.createElement('div');
    preview.className = 'preview';
    preset.preview.forEach((type, idx) => {
      const el = document.createElement('div');
      el.className = type === 'bar' ? 'bar' : 'tile';
      el.textContent = type === 'tile' ? 'UI' : '';
      preview.appendChild(el);
    });
    const title = document.createElement('div');
    title.className = 'label';
    title.textContent = preset.name;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = preset.desc;
    card.append(preview, title, meta);
    card.addEventListener('click', () => onAdd(preset));
    container.appendChild(card);
  });
}
