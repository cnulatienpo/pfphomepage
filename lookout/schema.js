// scripts/lookout/schema.js

export const FORBIDDEN_FIELD_NAMES = new Set([
  // Identity / traceability
  "user_id",
  "userid",
  "userId",
  "session_id",
  "sessionid",
  "sessionId",
  "account_id",
  "accountid",
  "accountId",
  "ip",
  "ip_address",
  "ipAddress",
  "email",
  "username",
  "device_id",
  "deviceId",
  "fingerprint",
  "cookie",
  "auth",
  "token",

  // High-resolution time / replay artifacts
  "timestamp",
  "ts",
  "time_ms",
  "timeMs",
  "time_ns",
  "timeNs",
  "monotonic",
  "trace",
  "span",
  "span_id",
  "spanId",

  // Raw inputs
  "text",
  "prompt",
  "content",
  "audio",
  "image",
  "frame",
  "keystrokes",
  "cursor",
  "mouse",
  "gps",
  "latitude",
  "lat",
  "longitude",
  "lon",
  "location",
]);

export const ALLOWED_CATEGORIES = new Set(["system", "environment"]);

// Event naming: lowercase, dot-separated
export const EVENT_TYPE_REGEX = /^[a-z]+(\.[a-z0-9]+)*$/;

// Allowed event types (expand over time)
export const ALLOWED_EVENT_TYPES = new Set([
  // System behavior
  "state.transition",
  "mode.enter",
  "mode.exit",
  "fallback.activated",
  "fallback.deactivated",
  "resolution.completed",
  "path.abandoned",
  "confidence.adjusted",
  "constraint.encountered",

  // Environment / pressure
  "environment.capability",
  "environment.resource_level",
  "environment.asset_availability",
  "environment.network_tier",
  "environment.sensor_presence",
]);

export const ALLOWED_CONDITION_KEYS = new Set([
  "time_bucket",
  "capability_tier",
  "resource_state",
  "network_tier",
  "asset_state",
  "sensor_presence",
]);

export const ALLOWED_TIERS = {
  capability_tier: new Set(["low", "mid", "high", "unknown"]),
  resource_state: new Set(["scarce", "normal", "abundant", "unknown"]),
  network_tier: new Set(["offline", "poor", "ok", "good", "unknown"]),
  asset_state: new Set(["missing", "partial", "present", "unknown"]),
  sensor_presence: new Set(["none", "mic", "motion", "mic+motion", "unknown"]),
};

export const REQUIRED_TOP_LEVEL_FIELDS = [
  "event_type",
  "category",
  "state_from",
  "state_to",
  "conditions",
  "outcome",
  "weight",
];