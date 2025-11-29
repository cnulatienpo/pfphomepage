#!/usr/bin/env node
import dgram from 'dgram';
import net from 'net';
import { WebSocketServer, WebSocket } from 'ws';

const PD_HOST = process.env.PD_HOST || '127.0.0.1';
const PD_PORT = Number(process.env.PD_PORT || 57120);
const WS_PORT = Number(process.env.WS_PORT || 8082);
const PD_TRANSPORT = (process.env.PD_TRANSPORT || 'udp').toLowerCase();

const connections = {
  wsClients: 0,
  pdMessagesIn: 0,
  pdMessagesOut: 0,
};

const wss = new WebSocketServer({ port: WS_PORT });
console.log(`[PureData Bridge] WebSocket server listening on ws://localhost:${WS_PORT}`);

wss.on('connection', (ws) => {
  connections.wsClients += 1;
  console.log(`[PureData Bridge] Browser connected (${connections.wsClients} total)`);
  ws.on('message', (data) => handleBrowserMessage(ws, data));
  ws.on('close', () => {
    connections.wsClients = Math.max(0, connections.wsClients - 1);
    console.log(`[PureData Bridge] Browser disconnected (${connections.wsClients} total)`);
  });
});

function broadcastToBrowsers(payload) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function handleBrowserMessage(ws, data) {
  let parsed;
  try {
    parsed = JSON.parse(data.toString());
  } catch (err) {
    console.warn('[PureData Bridge] Ignoring non-JSON browser message');
    return;
  }
  if (!parsed || parsed.type !== 'pd:in') return;
  const channel = parsed.channel || 'unknown';
  const value = typeof parsed.value === 'number' ? parsed.value : Number(parsed.value) || 0;
  sendToPureData(channel, value);
}

function pdMessageEnvelope(channel, value) {
  return {
    type: 'pd:out',
    channel,
    value,
    timestamp: Date.now(),
  };
}

// --- UDP SETUP ---
const udpSocket = dgram.createSocket('udp4');
udpSocket.on('error', (err) => {
  console.error('[PureData Bridge] UDP socket error', err);
});
udpSocket.on('listening', () => {
  const address = udpSocket.address();
  console.log(`[PureData Bridge] UDP listening ${address.address}:${address.port}`);
});
udpSocket.on('message', (msg) => {
  const parsed = parsePdMessage(msg.toString());
  if (!parsed) return;
  connections.pdMessagesIn += 1;
  broadcastToBrowsers(pdMessageEnvelope(parsed.channel, parsed.value));
});
udpSocket.bind(PD_PORT);

// --- TCP SETUP ---
let tcpClient = null;
let tcpTimer = null;
const tcpState = { connected: false };

function connectTcp() {
  if (tcpState.connected || PD_TRANSPORT !== 'tcp') return;
  tcpClient = new net.Socket();
  tcpClient.connect(PD_PORT, PD_HOST, () => {
    tcpState.connected = true;
    console.log(`[PureData Bridge] TCP connected to Pd at ${PD_HOST}:${PD_PORT}`);
  });
  tcpClient.on('data', (data) => {
    const chunks = data.toString().split(/\n+/);
    chunks.forEach((chunk) => {
      const parsed = parsePdMessage(chunk);
      if (!parsed) return;
      connections.pdMessagesIn += 1;
      broadcastToBrowsers(pdMessageEnvelope(parsed.channel, parsed.value));
    });
  });
  tcpClient.on('error', (err) => {
    console.warn('[PureData Bridge] TCP error', err.message);
  });
  tcpClient.on('close', () => {
    if (!tcpState.connected) return;
    tcpState.connected = false;
    console.warn('[PureData Bridge] TCP connection closed, retrying...');
    scheduleTcpReconnect();
  });
}

function scheduleTcpReconnect() {
  if (tcpTimer) return;
  tcpTimer = setTimeout(() => {
    tcpTimer = null;
    connectTcp();
  }, 1500);
}

connectTcp();

function parsePdMessage(text) {
  if (!text || !text.trim()) return null;
  const [channel, valueRaw] = text.trim().split(/\s+/);
  if (!channel) return null;
  const value = valueRaw !== undefined ? Number(valueRaw) : 0;
  return { channel, value: Number.isNaN(value) ? 0 : value };
}

function sendToPureData(channel, value) {
  const message = `${channel} ${value}`;
  connections.pdMessagesOut += 1;
  if (PD_TRANSPORT === 'tcp') {
    if (tcpClient && tcpState.connected) {
      tcpClient.write(`${message}\n`);
    } else {
      console.warn('[PureData Bridge] TCP not connected to Pd');
      scheduleTcpReconnect();
    }
    return;
  }
  udpSocket.send(message, PD_PORT, PD_HOST, (err) => {
    if (err) {
      console.warn('[PureData Bridge] UDP send error', err.message);
    }
  });
}

process.on('SIGINT', () => {
  console.log('\n[PureData Bridge] Shutting down');
  udpSocket.close();
  if (tcpClient) tcpClient.destroy();
  wss.close();
  process.exit(0);
});

setInterval(() => {
  console.log(
    `[PureData Bridge] Stats — WS clients: ${connections.wsClients}, Pd→Browser: ${connections.pdMessagesIn}, Browser→Pd: ${connections.pdMessagesOut}`,
  );
}, 15000);
