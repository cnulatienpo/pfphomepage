export function renderSpacingPreview(container) {
  container.innerHTML = '';
  const cells = Array.from({ length: 12 }).map((_, idx) => {
    const cell = document.createElement('div');
    cell.className = 'spacing-cell';
    cell.style.background = idx % 2 === 0 ? 'linear-gradient(90deg,#4ade80,#2b7de9)' : 'linear-gradient(90deg,#ffce00,#ff5757)';
    return cell;
  });
  container.append(...cells);
}
