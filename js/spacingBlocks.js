export function createSpacingBlock(size) {
  const el = document.createElement('div');
  el.style.height = `${size}px`;
  return el;
}
