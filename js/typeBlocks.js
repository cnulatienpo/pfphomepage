export function createTypeBlock(text, style) {
  const el = document.createElement('div');
  el.textContent = text;
  Object.assign(el.style, style);
  return el;
}
