// Integration bootstrap for Fisher-Price Theme Builder
import MaterialLoader from './materialLoader.js';
import { openGacha } from './materialGacha.js';
import { openWebGLPlayground, exportPNG } from './webglPlayground.js';
import { openTDPanel, sendCommand as sendTDCommand } from './touchdesignerBridge.js';
import { openPureDataPanel, getEnergyLevels } from './puredataPanel.js';
import { registerRecombinationGoals } from './themeplay-recombination-goals.js';

let initialized = false;

async function fillMaterialBins() {
  await MaterialLoader.init().catch(() => {});
  const sidebar = document.querySelector('#left-sidebar') || document.body;
  const bin = document.createElement('div');
  bin.id = 'material-bin';
  bin.style.display = 'grid';
  bin.style.gridTemplateColumns = 'repeat(auto-fill, minmax(72px, 1fr))';
  bin.style.gap = '6px';
  MaterialLoader.getAll('textures').slice(0, 40).forEach(mat => {
    const tile = document.createElement('div');
    tile.style.border = '1px solid #ccc';
    tile.style.borderRadius = '6px';
    tile.style.overflow = 'hidden';
    tile.style.cursor = 'grab';
    const img = document.createElement('img');
    img.src = mat.preview || mat.path;
    img.alt = mat.name;
    img.style.width = '100%';
    img.style.height = '72px';
    img.style.objectFit = 'cover';
    tile.appendChild(img);
    tile.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('layer:add', { detail: mat }));
      if (window.themeplay?.onAction) window.themeplay.onAction('layer:added');
    });
    bin.appendChild(tile);
  });
  sidebar.appendChild(bin);
}

function setupTopBar() {
  const bar = document.querySelector('#topbar') || document.body;
  const actions = [
    { label: 'Gacha', onClick: openGacha },
    { label: 'WebGL', onClick: () => openWebGLPlayground() },
    { label: 'TD', onClick: openTDPanel },
    { label: 'PD', onClick: openPureDataPanel }
  ];
  actions.forEach(action => {
    const btn = document.createElement('button');
    btn.textContent = action.label;
    btn.style.margin = '0 6px';
    btn.addEventListener('click', action.onClick);
    bar.appendChild(btn);
  });
}

function wireEvents() {
  document.addEventListener('gacha:received', (e) => {
    document.dispatchEvent(new CustomEvent('layer:add', { detail: e.detail }));
    window.themeplay?.onAction?.('recombination:first-gacha');
  });

  document.addEventListener('webgl:export', (e) => {
    document.dispatchEvent(new CustomEvent('layer:add', { detail: { type: 'image', src: e.detail } }));
    window.themeplay?.onAction?.('recombination:export');
  });

  document.addEventListener('webgl:render', () => {
    window.themeplay?.onAction?.('recombination:webgl-remix');
  });

  document.addEventListener('pd:energy', () => {
    const energy = getEnergyLevels();
    const border = document.body;
    border.style.outline = `4px solid rgba(255, 226, 74, ${Math.min(1, energy.rms * 2)})`;
    window.themeplay?.onAction?.('recombination:pd');
  });

  document.addEventListener('td:event', (e) => {
    if (e.detail?.message?.address === '/fp/useEffect') {
      const effectIdx = e.detail.message.args?.[0]?.value;
      if (typeof effectIdx === 'number') {
        openWebGLPlayground();
      }
    }
    window.themeplay?.onAction?.('recombination:td');
  });

  document.addEventListener('warp:applied', () => {
    window.themeplay?.onAction?.('recombination:warp');
  });
}

export async function bootstrapIntegration() {
  if (initialized) return;
  initialized = true;
  setupTopBar();
  fillMaterialBins();
  wireEvents();
  if (window.themeplay) registerRecombinationGoals(window.themeplay);

  // expose globals for quick access
  window.openGacha = openGacha;
  window.openWebGL = openWebGLPlayground;
  window.openTouchDesigner = openTDPanel;
  window.openPureData = openPureDataPanel;
  window.sendTDCommand = sendTDCommand;
  window.exportWebGLPNG = exportPNG;
}

// Auto-init after layoutShell if present
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => bootstrapIntegration(), 0);
} else {
  document.addEventListener('DOMContentLoaded', () => bootstrapIntegration());
}

export default { bootstrapIntegration };
