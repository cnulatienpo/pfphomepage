export function renderSnapControls(toggleEl, canvasEngine) {
  toggleEl.addEventListener('change', (e) => {
    canvasEngine.toggleGrid(e.target.checked);
  });
}
