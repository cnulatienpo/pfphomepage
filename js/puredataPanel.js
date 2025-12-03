// Fisher-Price Theme Builder - Pure Data Panel (front-end)

const WS_URL = 'ws://localhost:17900';

class PdBridge extends EventTarget {
  constructor() {
    super();
    this.socket = null;
    this.energy = { low: 0, mid: 0, high: 0, rms: 0 };
    this.connect();
  }

  connect() {
    this.socket = new WebSocket(WS_URL);
    this.socket.addEventListener('open', () => this.dispatchEvent(new Event('open')));
    this.socket.addEventListener('message', (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === 'energy') {
          this.energy = data.payload;
          this.dispatchEvent(new CustomEvent('pd:energy', { detail: this.energy }));
          document.dispatchEvent(new CustomEvent('pd:energy', { detail: this.energy }));
          if (data.payload.beat) document.dispatchEvent(new Event('pd:beat'));
        }
      } catch (err) {
        console.warn('pd message parse error', err);
      }
    });
    this.socket.addEventListener('close', () => setTimeout(() => this.connect(), 1000));
  }

  getEnergy() { return { ...this.energy }; }
}

const bridge = new PdBridge();

export function on(eventName, handler) {
  bridge.addEventListener(eventName, handler);
}

export function getEnergyLevels() {
  return bridge.getEnergy();
}

function renderBars(container) {
  container.innerHTML = '';
  const labels = ['low', 'mid', 'high'];
  labels.forEach(label => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '6px';
    const name = document.createElement('div');
    name.textContent = label.toUpperCase();
    name.style.width = '50px';
    const bar = document.createElement('div');
    bar.style.flex = '1';
    bar.style.height = '12px';
    bar.style.borderRadius = '6px';
    bar.style.background = '#19313f';
    const fill = document.createElement('div');
    fill.style.height = '100%';
    fill.style.width = '0%';
    fill.style.borderRadius = '6px';
    fill.style.transition = 'width 120ms ease, background 120ms ease';
    bar.appendChild(fill);
    row.append(name, bar);
    container.appendChild(row);
    bridge.addEventListener('pd:energy', (e) => {
      const lvl = e.detail[label] || 0;
      fill.style.width = `${Math.min(1, lvl) * 100}%`;
      fill.style.background = label === 'low' ? '#f5b700' : label === 'mid' ? '#ff5ab1' : '#5ad1ff';
    });
  });
}

export function openPureDataPanel() {
  let panel = document.getElementById('pd-panel');
  if (panel) { panel.style.display = 'block'; return panel; }
  const style = document.createElement('style');
  style.textContent = `
    #pd-panel { position: fixed; right: 280px; bottom: 10px; width: 260px; background: #0a1020; color: #d7ecff; border: 1px solid #7df5ff; border-radius: 10px; padding: 10px; z-index: 7000; box-shadow: 0 6px 18px rgba(0,0,0,0.4);} 
    #pd-panel h4 { margin: 0 0 6px; color: #ffe24a; }
    #pd-panel .status { font-size: 12px; opacity: 0.8; }
  `;
  document.head.appendChild(style);

  panel = document.createElement('div');
  panel.id = 'pd-panel';
  const title = document.createElement('h4');
  title.textContent = 'Pure Data Pulse';
  const status = document.createElement('div');
  status.className = 'status';
  status.textContent = 'Connecting...';

  const bars = document.createElement('div');
  renderBars(bars);

  const close = document.createElement('button');
  close.textContent = 'Close';
  close.style.width = '100%';
  close.style.marginTop = '8px';
  close.addEventListener('click', () => { panel.style.display = 'none'; });

  panel.append(title, status, bars, close);
  document.body.appendChild(panel);

  bridge.addEventListener('open', () => { status.textContent = 'Connected to PD bridge.'; });
  bridge.addEventListener('pd:energy', (e) => {
    status.textContent = `RMS: ${(e.detail.rms || 0).toFixed(3)}`;
  });

  return panel;
}

export default { openPureDataPanel, getEnergyLevels, on };
