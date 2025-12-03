// Fisher-Price Theme Builder - TouchDesigner Bridge (front-end)

const WS_URL = 'ws://localhost:17880/ws';
const HTTP_URL = 'http://localhost:17880/send';

class TDConnection extends EventTarget {
  constructor() {
    super();
    this.socket = null;
    this.queue = [];
    this.connect();
  }

  connect() {
    this.socket = new WebSocket(WS_URL);
    this.socket.addEventListener('open', () => {
      this.queue.forEach(msg => this.socket.send(JSON.stringify(msg)));
      this.queue = [];
      this.dispatchEvent(new Event('open'));
    });
    this.socket.addEventListener('message', (evt) => {
      try {
        const data = JSON.parse(evt.data);
        this.dispatchEvent(new CustomEvent('td:event', { detail: data }));
      } catch (err) {
        console.warn('TD message parse error', err);
      }
    });
    this.socket.addEventListener('close', () => {
      setTimeout(() => this.connect(), 1000);
    });
  }

  async sendCommand(address, args = []) {
    const payload = { address, args };
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.queue.push(payload);
    } else {
      this.socket.send(JSON.stringify(payload));
    }
    try {
      await fetch(HTTP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('TD HTTP send failed', err);
    }
  }
}

const connection = new TDConnection();

export function sendCommand(address, args) {
  return connection.sendCommand(address, args);
}

export function onTouchDesignerEvent(handler) {
  connection.addEventListener('td:event', handler);
}

export function openTDPanel() {
  let panel = document.getElementById('td-panel');
  if (panel) { panel.style.display = 'block'; return panel; }
  const style = document.createElement('style');
  style.textContent = `
    #td-panel { position: fixed; right: 10px; bottom: 10px; width: 260px; background: #0a141f; color: #dff4ff; border: 1px solid #4dd0ff; border-radius: 10px; padding: 10px; z-index: 7000; box-shadow: 0 6px 18px rgba(0,0,0,0.4);} 
    #td-panel h4 { margin: 0 0 6px; color: #ffe24a; }
    #td-panel button { width: 100%; margin-top: 6px; background: #123; color: #fff; border: 1px solid #4dd0ff; border-radius: 8px; padding: 6px; }
    #td-panel .status { font-size: 12px; opacity: 0.8; }
  `;
  document.head.appendChild(style);

  panel = document.createElement('div');
  panel.id = 'td-panel';
  const title = document.createElement('h4');
  title.textContent = 'TouchDesigner Bridge';
  const status = document.createElement('div');
  status.className = 'status';
  status.textContent = 'Connecting...';
  const btn = document.createElement('button');
  btn.textContent = 'Send Ping to TD';
  btn.addEventListener('click', () => sendCommand('/fp/ping', [Date.now()]));
  const close = document.createElement('button');
  close.textContent = 'Close';
  close.addEventListener('click', () => { panel.style.display = 'none'; });
  panel.append(title, status, btn, close);
  document.body.appendChild(panel);

  connection.addEventListener('open', () => {
    status.textContent = 'Connected to TD bridge.';
  });
  connection.addEventListener('td:event', (e) => {
    status.textContent = `Last: ${JSON.stringify(e.detail)}`;
    document.dispatchEvent(new CustomEvent('td:event', { detail: e.detail }));
  });

  return panel;
}

export default { sendCommand, onTouchDesignerEvent, openTDPanel };
