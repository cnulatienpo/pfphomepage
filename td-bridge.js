// TouchDesigner Bridge server
// CommonJS module: run with `node td-bridge.js`
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const WebSocket = require('ws');
const osc = require('osc');

const PORT = process.env.TD_BRIDGE_PORT ? Number(process.env.TD_BRIDGE_PORT) : 17880;
const TD_HOST = process.env.TD_HOST || '127.0.0.1';
const TD_PORT = process.env.TD_PORT ? Number(process.env.TD_PORT) : 17881;
const IN_PORT = process.env.TD_IN_PORT ? Number(process.env.TD_IN_PORT) : 17882;

const app = express();
app.use(bodyParser.json());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

const udpPort = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: IN_PORT,
  remoteAddress: TD_HOST,
  remotePort: TD_PORT,
  metadata: true
});

udpPort.on('ready', () => {
  console.log(`[td-bridge] Listening for OSC on ${IN_PORT}, sending to ${TD_HOST}:${TD_PORT}`);
});

udpPort.on('message', (oscMsg) => {
  const payload = { type: 'osc', message: oscMsg };
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
});

udpPort.on('error', (err) => console.error('[td-bridge] OSC error', err));
udpPort.open();

app.post('/send', (req, res) => {
  const { address, args = [] } = req.body || {};
  if (!address) return res.status(400).json({ error: 'address required' });
  udpPort.send({ address, args: args.map(mapOscArg) });
  res.json({ ok: true });
});

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const { address, args = [] } = JSON.parse(data);
      if (address) udpPort.send({ address, args: args.map(mapOscArg) });
    } catch (err) {
      console.warn('[td-bridge] bad websocket data', err);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[td-bridge] HTTP/WS listening on ${PORT}`);
});

function mapOscArg(arg) {
  if (typeof arg === 'number') return { type: 'f', value: arg };
  if (typeof arg === 'string') return { type: 's', value: arg };
  return { type: 's', value: String(arg) };
}
