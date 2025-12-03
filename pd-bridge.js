// Pure Data bridge server
// CommonJS script: run with `node pd-bridge.js`
const { spawn } = require('child_process');
const WebSocket = require('ws');

const PORT = process.env.PD_BRIDGE_PORT ? Number(process.env.PD_BRIDGE_PORT) : 17900;
const PATCH_PATH = process.env.PD_PATCH || './external/pd/analysis.pd';

const wss = new WebSocket.Server({ port: PORT });
console.log(`[pd-bridge] WebSocket listening on ${PORT}`);

let pdProcess = null;
function startPd() {
  try {
    pdProcess = spawn('pd', ['-nogui', PATCH_PATH]);
    pdProcess.stdout.on('data', (d) => parseData(d.toString()));
    pdProcess.stderr.on('data', (d) => console.error('[pd-bridge]', d.toString()));
    pdProcess.on('exit', (code) => {
      console.log('[pd-bridge] pd exited', code);
      setTimeout(startPd, 1500);
    });
  } catch (err) {
    console.error('[pd-bridge] Unable to start pd', err);
  }
}

function parseData(str) {
  // Expect lines like: energy low mid high rms beat
  str.split(/\n+/).forEach(line => {
    if (!line.trim()) return;
    if (line.startsWith('energy')) {
      const parts = line.trim().split(/\s+/);
      const payload = {
        low: Number(parts[1]) || 0,
        mid: Number(parts[2]) || 0,
        high: Number(parts[3]) || 0,
        rms: Number(parts[4]) || 0,
        beat: Boolean(Number(parts[5]))
      };
      broadcast({ type: 'energy', payload });
    }
  });
}

function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'hello', payload: 'pd-bridge' }));
});

startPd();
