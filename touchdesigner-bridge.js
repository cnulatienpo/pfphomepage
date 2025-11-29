import dgram from 'dgram';
import osc from 'osc-min';
import { WebSocketServer } from 'ws';

const TD_HOST = process.env.TD_HOST || '127.0.0.1';
const TD_PORT = Number(process.env.TD_PORT || 9000); // Incoming from TouchDesigner
const TD_LISTEN_PORT = Number(process.env.TD_LISTEN_PORT || 9001); // Outgoing to TouchDesigner
const WS_PORT = Number(process.env.TD_WS_PORT || 8083);

const udpIn = dgram.createSocket('udp4');
const udpOut = dgram.createSocket('udp4');
const wsServer = new WebSocketServer({ port: WS_PORT });

let oscMessageCount = 0;
let wsMessageCount = 0;

function logStatus(message) {
  const ts = new Date().toISOString();
  console.log(`[TD-BRIDGE ${ts}] ${message}`);
}

function broadcastToClients(payload) {
  const serialized = JSON.stringify(payload);
  wsServer.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(serialized);
    }
  });
}

function parseOscPacket(packet) {
  try {
    const decoded = osc.fromBuffer(packet);
    if (!decoded) return [];
    if (decoded.elements) {
      return decoded.elements.flatMap((element) => normalizeOscMessage(element));
    }
    return normalizeOscMessage(decoded);
  } catch (error) {
    logStatus(`Failed to parse OSC packet: ${error.message}`);
    return [];
  }
}

function normalizeOscMessage(msg) {
  if (!msg || !msg.address) return [];
  const address = msg.address;
  const channel = address.split('/').filter(Boolean).pop() || 'channel';
  const valueArg = Array.isArray(msg.args) && msg.args.length > 0 ? msg.args[0].value ?? msg.args[0] : null;
  const value = typeof valueArg === 'object' && valueArg !== null && 'value' in valueArg ? valueArg.value : valueArg;
  const payload = {
    type: 'td:out',
    address,
    channel,
    value,
    args: Array.isArray(msg.args)
      ? msg.args.map((arg) => ('value' in arg ? arg.value : arg))
      : [],
    timestamp: Date.now(),
  };
  return [payload];
}

udpIn.on('message', (msg) => {
  oscMessageCount += 1;
  const normalized = parseOscPacket(msg);
  normalized.forEach((payload) => broadcastToClients(payload));
});

udpIn.on('listening', () => {
  const address = udpIn.address();
  logStatus(`Listening for TouchDesigner OSC on ${address.address}:${address.port}`);
});

udpIn.bind(TD_PORT);

function sendOscToTouchDesigner(channel, value) {
  const address = `/theme/${channel}`;
  try {
    const oscMsg = osc.toBuffer({
      address,
      args: [{ type: 'float', value: Number(value) }],
    });
    udpOut.send(oscMsg, 0, oscMsg.length, TD_LISTEN_PORT, TD_HOST);
  } catch (error) {
    logStatus(`Failed to encode OSC for ${address}: ${error.message}`);
  }
}

wsServer.on('connection', (socket) => {
  logStatus('Browser connected to TouchDesigner bridge');
  socket.on('message', (data) => {
    wsMessageCount += 1;
    try {
      const parsed = JSON.parse(data.toString());
      if (parsed?.type === 'td:in' && parsed.channel) {
        sendOscToTouchDesigner(parsed.channel, parsed.value ?? 0);
      }
    } catch (error) {
      logStatus(`Failed to parse WebSocket message: ${error.message}`);
    }
  });

  socket.send(
    JSON.stringify({
      type: 'td:hello',
      message: 'TouchDesigner bridge ready',
      ports: { tdIn: TD_PORT, tdOut: TD_LISTEN_PORT, ws: WS_PORT },
      stats: { oscMessageCount, wsMessageCount },
    }),
  );
});

setInterval(() => {
  logStatus(
    `Heartbeat — OSC packets: ${oscMessageCount}, WebSocket messages: ${wsMessageCount}, Clients: ${wsServer.clients.size}`,
  );
}, 10000);

logStatus(
  `TouchDesigner bridge starting. TD_HOST=${TD_HOST}, TD_PORT=${TD_PORT}, TD_LISTEN_PORT=${TD_LISTEN_PORT}, WS_PORT=${WS_PORT}`,
);

process.on('SIGINT', () => {
  logStatus('Shutting down TouchDesigner bridge');
  udpIn.close();
  udpOut.close();
  wsServer.close();
  process.exit(0);
});

// TouchDesigner wiring guidance (text-only):
//  - Add an "OSC Out" CHOP or DAT in TouchDesigner with destination host TD_HOST and port TD_PORT.
//  - Send channels like /td/beat, /td/bassEnergy, /td/midsEnergy, /td/highsEnergy, /td/motion, /td/sceneIndex.
//  - Add an "OSC In" CHOP or DAT listening on TD_LISTEN_PORT to receive /theme/layout_density, /theme/parallax_intensity,
//    /theme/glitch_amount or other theme-directed channels you map from the browser.
//  - You can also connect a WebSocket DAT to ws://localhost:WS_PORT if you prefer WebSockets over OSC.
