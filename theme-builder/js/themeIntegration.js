export const themeUtilities = {
  typeRamp: ['h1', 'h2', 'body', 'label'],
  spacing: ['p-2', 'p-4', 'm-2', 'm-4', 'gap-4', 'gap-8'],
  layout: ['row', 'col', 'container', 'grid-x'],
  colors: ['bg-slate-900', 'bg-amber-900', 'bg-emerald-900', 'text-amber-200'],
  borders: ['border', 'border-strong', 'panel', 'box'],
};

export const components = [
  { name: 'Header', classes: ['row', 'p-4', 'bg-amber-900'] },
  { name: 'Panel', classes: ['panel', 'p-4', 'border'] },
  { name: 'Callout', classes: ['box', 'p-4', 'bg-slate-900', 'text-amber-200'] },
  { name: 'Button', classes: ['btn', 'bg-amber-700', 'p-2'] },
];

export function renderComponentButtons(container, onAdd) {
  container.innerHTML = '';
  components.forEach((component) => {
    const btn = document.createElement('button');
    btn.textContent = `${component.name}`;
    btn.addEventListener('click', () => onAdd(component));
    container.appendChild(btn);
  });
}

export function applyUtility(layer, utility) {
  if (!layer.classes.includes(utility)) {
    layer.classes.push(utility);
  }
  return layer;
}
