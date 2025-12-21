// scripts/lookout/autopilot.js
//
// Lookout Autopilot
// -----------------
// Emits synthetic, grammar-compliant system events on an interval.
// Purpose: generate real Lookout data with ZERO app integration.
//
// This is safe to delete later.

import { emitLookoutEvent } from "./emitter.js";

const MODES = ["stable", "exploratory", "constrained", "degraded"];
const OUTCOMES = ["ok", "recoverable", "failed"];
const CAPABILITY = ["low", "mid", "high"];
const RESOURCE = ["scarce", "normal", "abundant"];
const NETWORK = ["offline", "poor", "ok", "good"];
const ASSET = ["missing", "partial", "present"];

let currentMode = MODES[Math.floor(Math.random() * MODES.length)];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomConditions() {
  return {
    capability_tier: pick(CAPABILITY),
    resource_state: pick(RESOURCE),
    network_tier: pick(NETWORK),
    asset_state: pick(ASSET),
  };
}

async function emitModeTransition() {
  const nextMode = pick(MODES.filter(m => m !== currentMode));
  const prev = currentMode;
  currentMode = nextMode;

  await emitLookoutEvent({
    event_type: "mode.enter",
    category: "system",
    state_from: prev,
    state_to: nextMode,
    conditions: randomConditions(),
    outcome: pick(OUTCOMES),
    weight: 1
  });
}

async function emitConstraint() {
  await emitLookoutEvent({
    event_type: "constraint.encountered",
    category: "system",
    state_from: currentMode,
    state_to: currentMode,
    conditions: randomConditions(),
    outcome: "ok",
    weight: 1
  });
}

async function emitFallback() {
  await emitLookoutEvent({
    event_type: "fallback.activated",
    category: "system",
    state_from: currentMode,
    state_to: "degraded",
    conditions: randomConditions(),
    outcome: "recoverable",
    weight: 1
  });
  currentMode = "degraded";
}

async function tick() {
  const r = Math.random();

  if (r < 0.5) {
    await emitModeTransition();
  } else if (r < 0.8) {
    await emitConstraint();
  } else {
    await emitFallback();
  }
}

// Emit every 10–30 seconds, jittered
function schedule() {
  const delay = 10000 + Math.random() * 20000;
  setTimeout(async () => {
    try {
      await tick();
    } catch {
      // ignored by design
    }
    schedule();
  }, delay);
}

console.log("[lookout] autopilot started");
schedule();
