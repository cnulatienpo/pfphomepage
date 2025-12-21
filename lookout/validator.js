// scripts/lookout/validator.js
import {
  FORBIDDEN_FIELD_NAMES,
  ALLOWED_CATEGORIES,
  EVENT_TYPE_REGEX,
  ALLOWED_EVENT_TYPES,
  ALLOWED_CONDITION_KEYS,
  ALLOWED_TIERS,
  REQUIRED_TOP_LEVEL_FIELDS,
} from "./schema.js";

/**
 * Recursively checks object keys for forbidden fields (case-insensitive compare)
 */
function hasForbiddenFields(value) {
  if (value === null || value === undefined) return false;

  if (Array.isArray(value)) {
    for (const item of value) {
      if (hasForbiddenFields(item)) return true;
    }
    return false;
  }

  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const keyNorm = String(k).trim();
      const keyLower = keyNorm.toLowerCase();
      if (FORBIDDEN_FIELD_NAMES.has(keyNorm) || FORBIDDEN_FIELD_NAMES.has(keyLower)) {
        return true;
      }
      if (hasForbiddenFields(v)) return true;
    }
  }

  return false;
}

function isPlainObject(x) {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

// Coarse time bucket
export function computeTimeBucket(dateObj) {
  const h = dateObj.getUTCHours();
  if (h >= 0 && h <= 5) return "night";
  if (h >= 6 && h <= 11) return "morning";
  if (h >= 12 && h <= 17) return "afternoon";
  return "evening";
}

function coerceInt(n, fallback = 1) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  const i = Math.trunc(v);
  return i <= 0 ? fallback : i;
}

function safeString(x, fallback = "unknown") {
  if (typeof x !== "string") return fallback;
  const s = x.trim();
  return s.length ? s : fallback;
}

function normalizeConditions(conditions, nowUtc) {
  const base = {
    time_bucket: computeTimeBucket(nowUtc),
    capability_tier: "unknown",
    resource_state: "unknown",
    network_tier: "unknown",
    asset_state: "unknown",
    sensor_presence: "unknown",
  };

  if (!isPlainObject(conditions)) return base;

  const out = { ...base };

  for (const [k, v] of Object.entries(conditions)) {
    if (!ALLOWED_CONDITION_KEYS.has(k)) continue;

    const sv = safeString(v, base[k]);

    // Validate tier values
    if (ALLOWED_TIERS[k] && !ALLOWED_TIERS[k].has(sv)) continue;

    out[k] = sv;
  }

  // time_bucket is always recomputed from server time
  out.time_bucket = base.time_bucket;
  return out;
}

export function validateAndNormalizeEvent(rawEvent) {
  // Must be a plain object
  if (!isPlainObject(rawEvent)) return null;

  // Reject if forbidden keys exist anywhere in payload
  if (hasForbiddenFields(rawEvent)) return null;

  // Required fields present?
  for (const f of REQUIRED_TOP_LEVEL_FIELDS) {
    if (!(f in rawEvent)) return null;
  }

  const event_type = safeString(rawEvent.event_type, "");
  const category = safeString(rawEvent.category, "");
  const outcome = safeString(rawEvent.outcome, "unknown");

  if (!EVENT_TYPE_REGEX.test(event_type)) return null;
  if (!ALLOWED_EVENT_TYPES.has(event_type)) return null;
  if (!ALLOWED_CATEGORIES.has(category)) return null;

  // State fields can be null or string
  const state_from =
    rawEvent.state_from === null ? null : safeString(rawEvent.state_from, "unknown");
  const state_to =
    rawEvent.state_to === null ? null : safeString(rawEvent.state_to, "unknown");

  // Time is bucketed server-side (UTC)
  const nowUtc = new Date();
  const conditions = normalizeConditions(rawEvent.conditions, nowUtc);

  const weight = coerceInt(rawEvent.weight, 1);

  // Return normalized event without any extra fields
  return {
    event_type,
    category,
    state_from,
    state_to,
    conditions,
    outcome,
    weight,
    // no timestamps stored; bucket only
  };
}