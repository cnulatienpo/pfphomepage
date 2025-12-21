// scripts/lookout/emitter.js
//
// Lookout Event Emitter
// ---------------------
// This helper enforces the Lookout Event Grammar at the *producer* side.
// Apps should NEVER POST directly to /lookout/event without going through this.
//
// Design goals:
// - prevent identity leakage
// - prevent accidental raw data emission
// - keep event payloads small, categorical, and boring
// - fail silently by default (no retries, no queues)

const DEFAULT_LOOKOUT_ENDPOINT =
  typeof process !== "undefined" && process.env?.LOOKOUT_ENDPOINT
    ? process.env.LOOKOUT_ENDPOINT
    : "http://localhost:8787/lookout/event";

/**
 * Hard allow-lists (mirrors backend schema)
 */
const ALLOWED_EVENT_TYPES = new Set([
  // system
  "state.transition",
  "mode.enter",
  "mode.exit",
  "fallback.activated",
  "fallback.deactivated",
  "resolution.completed",
  "path.abandoned",
  "confidence.adjusted",
  "constraint.encountered",

  // environment
  "environment.capability",
  "environment.resource_level",
  "environment.asset_availability",
  "environment.network_tier",
  "environment.sensor_presence",
]);

const ALLOWED_CATEGORIES = new Set(["system", "environment"]);

const ALLOWED_CONDITIONS = {
  capability_tier: new Set(["low", "mid", "high", "unknown"]),
  resource_state: new Set(["scarce", "normal", "abundant", "unknown"]),
  network_tier: new Set(["offline", "poor", "ok", "good", "unknown"]),
  asset_state: new Set(["missing", "partial", "present", "unknown"]),
  sensor_presence: new Set(["none", "mic", "motion", "mic+motion", "unknown"]),
};

const EVENT_NAME_REGEX = /^[a-z]+(\.[a-z0-9]+)*$/;

/**
 * Remove any fields we never want to transmit,
 * even if the caller accidentally passes them.
 */
function stripDangerousFields(obj) {
  if (obj == null || typeof obj !== "object") return obj;

  const banned = new Set([
    "user",
    "user_id",
    "session",
    "session_id",
    "account",
    "email",
    "username",
    "ip",
    "token",
    "auth",
    "text",
    "content",
    "prompt",
    "audio",
    "image",
    "frame",
    "cursor",
    "keystroke",
    "location",
    "lat",
    "lon",
    "gps",
    "timestamp",
    "time",
  ]);

  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (banned.has(k.toLowerCase())) continue;
    out[k] = v;
  }
  return out;
}

function normalizeString(x, fallback = "unknown") {
  if (typeof x !== "string") return fallback;
  const s = x.trim();
  return s.length ? s : fallback;
}

function normalizeWeight(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 1;
  const i = Math.trunc(n);
  return i <= 0 ? 1 : i;
}

function normalizeConditions(raw) {
  const base = {
    capability_tier: "unknown",
    resource_state: "unknown",
    network_tier: "unknown",
    asset_state: "unknown",
    sensor_presence: "unknown",
  };

  if (raw == null || typeof raw !== "object") return base;

  const cleaned = stripDangerousFields(raw);
  const out = { ...base };

  for (const [k, allowed] of Object.entries(ALLOWED_CONDITIONS)) {
    if (cleaned[k] && allowed.has(cleaned[k])) {
      out[k] = cleaned[k];
    }
  }

  return out;
}

/**
 * Build a Lookout-safe event payload.
 * Returns null if the event is invalid or unsafe.
 */
function buildEvent({
  event_type,
  category,
  state_from = null,
  state_to = null,
  conditions = {},
  outcome = "ok",
  weight = 1,
}) {
  if (!ALLOWED_EVENT_TYPES.has(event_type)) return null;
  if (!EVENT_NAME_REGEX.test(event_type)) return null;
  if (!ALLOWED_CATEGORIES.has(category)) return null;

  return {
    event_type,
    category,
    state_from: state_from === null ? null : normalizeString(state_from),
    state_to: state_to === null ? null : normalizeString(state_to),
    conditions: normalizeConditions(conditions),
    outcome: normalizeString(outcome),
    weight: normalizeWeight(weight),
  };
}

/**
 * Emit a Lookout event.
 *
 * This function:
 * - does not throw
 * - does not retry
 * - does not log payloads
 * - silently drops invalid events
 */
export async function emitLookoutEvent(event, options = {}) {
  const endpoint = options.endpoint || DEFAULT_LOOKOUT_ENDPOINT;

  const safeEvent = buildEvent(stripDangerousFields(event));
  if (!safeEvent) return false;

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeEvent),
      keepalive: true, // allows fire-and-forget in browsers
    });
    return true;
  } catch {
    // Deliberately ignored.
    // Lookout must never block app behavior.
    return false;
  }
}