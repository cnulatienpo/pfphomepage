const defaultUrl = 'ws://localhost:8083';
let socket = null;
let currentUrl = defaultUrl;
let reconnectTimer = null;
let connectionState = 'disconnected';
let reconnectAttempts = 0;

const channels = new Map();
const states = new Map();
const events = [];
const channelSubscribers = new Map();
const eventSubscribers = new Set();
const messageSubscribers = new Set();

function setConnectionState(next) {
  connectionState = next;
  document.body.dataset.tdConnected = next === 'connected' ? 'true' : 'false';
}

export function connectToTouchDesigner(options = {}) {
  const { wsUrl = currentUrl } = options;
  currentUrl = wsUrl;
  clearTimeout(reconnectTimer);
  if (socket) {
    socket.close();
  }

  setConnectionState('connecting');
  socket = new WebSocket(wsUrl);

  socket.addEventListener('open', () => {
    reconnectAttempts = 0;
    setConnectionState('connected');
  });

  socket.addEventListener('close', () => {
    setConnectionState('disconnected');
    scheduleReconnect();
  });

  socket.addEventListener('error', () => {
    setConnectionState('error');
    scheduleReconnect();
  });

  socket.addEventListener('message', (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch (error) {
      return;
    }

    if (!payload) return;
    messageSubscribers.forEach((cb) => cb(payload));

    if (payload.type === 'td:out') {
      const name = payload.channel || 'channel';
      const value = typeof payload.value === 'number' ? payload.value : Number(payload.value) || 0;
      const ts = payload.timestamp || Date.now();
      channels.set(name, { value, lastUpdated: ts });
      if (payload.address?.includes('/state')) {
        states.set(name, payload.value);
      }
      if (payload.address?.includes('/event')) {
        const evt = { name, payload: payload.args || [], timestamp: ts };
        events.push(evt);
        if (events.length > 100) events.shift();
        eventSubscribers.forEach((cb) => cb(evt));
      }
      const subs = channelSubscribers.get(name);
      if (subs) {
        subs.forEach((cb) => cb(value, name));
      }
    }
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectAttempts += 1;
  const delay = Math.min(5000, 500 * reconnectAttempts);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToTouchDesigner({ wsUrl: currentUrl });
  }, delay);
}

export function disconnectFromTouchDesigner() {
  clearTimeout(reconnectTimer);
  if (socket) {
    socket.close();
    socket = null;
  }
  setConnectionState('disconnected');
}

export function isTouchDesignerConnected() {
  return connectionState === 'connected';
}

export function subscribeChannel(name, callback) {
  if (!channelSubscribers.has(name)) {
    channelSubscribers.set(name, new Set());
  }
  channelSubscribers.get(name).add(callback);
}

export function unsubscribeChannel(name, callback) {
  const set = channelSubscribers.get(name);
  if (set) {
    set.delete(callback);
  }
}

export function getChannelValue(name, defaultValue = 0) {
  return channels.get(name)?.value ?? defaultValue;
}

export function getChannelsSnapshot() {
  const snapshot = {};
  channels.forEach((value, key) => {
    snapshot[key] = value;
  });
  return snapshot;
}

export function getStatesSnapshot() {
  const snapshot = {};
  states.forEach((value, key) => {
    snapshot[key] = value;
  });
  return snapshot;
}

export function getRecentEvents() {
  return [...events];
}

export function sendChannelToTouchDesigner(name, value) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  const payload = { type: 'td:in', channel: name, value };
  socket.send(JSON.stringify(payload));
}

export function onTouchDesignerEvent(callback) {
  eventSubscribers.add(callback);
  return () => eventSubscribers.delete(callback);
}

export function onTouchDesignerMessage(callback) {
  messageSubscribers.add(callback);
  return () => messageSubscribers.delete(callback);
}

export function getTouchDesignerConfig() {
  return { wsUrl: currentUrl, connected: isTouchDesignerConnected() };
}

export function setTouchDesignerConfig(config = {}) {
  if (config.wsUrl) {
    currentUrl = config.wsUrl;
  }
  if (config.autoConnect) {
    connectToTouchDesigner({ wsUrl: currentUrl });
  }
}

connectToTouchDesigner({ wsUrl: currentUrl });
