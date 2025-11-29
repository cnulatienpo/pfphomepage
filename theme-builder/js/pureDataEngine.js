const DEFAULT_WS_URL = 'ws://localhost:8082';
let socket = null;
let wsUrl = DEFAULT_WS_URL;
let reconnectTimer = null;
let shouldReconnect = true;
let status = 'disconnected';
const statusListeners = new Set();
const channelListeners = new Map();
const channelState = new Map();
const pendingMessages = [];

function setStatus(next) {
  status = next;
  statusListeners.forEach((fn) => fn(status));
}

export function connectToPureData(options = {}) {
  wsUrl = options.wsUrl || wsUrl;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }
  shouldReconnect = true;
  setStatus('connecting');
  socket = new WebSocket(wsUrl);
  socket.addEventListener('open', () => {
    setStatus('connected');
    flushPending();
  });
  socket.addEventListener('message', (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === 'pd:out') {
        handleIncomingChannel(payload.channel, payload.value, payload.timestamp);
      }
    } catch (err) {
      console.warn('[PureDataEngine] Unable to parse Pd message', err);
    }
  });
  socket.addEventListener('close', () => {
    setStatus('disconnected');
    scheduleReconnect();
  });
  socket.addEventListener('error', () => {
    socket?.close();
  });
  return socket;
}

export function disconnectFromPureData() {
  shouldReconnect = false;
  if (socket) {
    socket.close();
  }
}

function scheduleReconnect() {
  if (!shouldReconnect) return;
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToPureData({ wsUrl });
  }, 1200);
}

function flushPending() {
  while (pendingMessages.length && socket?.readyState === WebSocket.OPEN) {
    const msg = pendingMessages.shift();
    socket.send(msg);
  }
}

function handleIncomingChannel(channel, value, timestamp = Date.now()) {
  const entry = { value, lastUpdated: timestamp };
  channelState.set(channel, entry);
  const listeners = channelListeners.get(channel);
  if (listeners) {
    listeners.forEach((fn) => fn(value, channel));
  }
}

export function subscribeChannel(channelName, callback) {
  if (!channelListeners.has(channelName)) {
    channelListeners.set(channelName, new Set());
  }
  channelListeners.get(channelName).add(callback);
}

export function unsubscribeChannel(channelName, callback) {
  const listeners = channelListeners.get(channelName);
  if (listeners) {
    listeners.delete(callback);
  }
}

export function subscribeStatus(callback) {
  statusListeners.add(callback);
  return () => statusListeners.delete(callback);
}

export function isPureDataConnected() {
  return socket?.readyState === WebSocket.OPEN;
}

export function getChannelValue(channelName, defaultValue = 0) {
  const entry = channelState.get(channelName);
  return entry ? entry.value : defaultValue;
}

export function getChannelSnapshot() {
  return Array.from(channelState.entries()).map(([channel, info]) => ({ channel, ...info }));
}

export function sendToPureData(channelName, value) {
  const payload = JSON.stringify({ type: 'pd:in', channel: channelName, value });
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(payload);
  } else {
    pendingMessages.push(payload);
    scheduleReconnect();
  }
}

export function getPureDataStatus() {
  return status;
}
