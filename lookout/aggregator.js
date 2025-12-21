// scripts/lookout/aggregator.js
import { LOOKOUT_CONFIG } from "./config.js";

function addNoise(count) {
  const amp = LOOKOUT_CONFIG.aggregation.noiseAmplitude;
  if (!amp || amp <= 0) return count;
  const delta = Math.floor((Math.random() * (2 * amp + 1)) - amp);
  const v = count + delta;
  return v < 0 ? 0 : v;
}

function keyForAggregateRow(ev) {
  // A row describes system behavior under conditions, without identity or time continuity.
  const c = ev.conditions;
  return [
    ev.event_type,
    ev.category,
    ev.state_from ?? "null",
    ev.state_to ?? "null",
    c.time_bucket,
    c.capability_tier,
    c.resource_state,
    c.network_tier,
    c.asset_state,
    c.sensor_presence,
    ev.outcome,
  ].join("|");
}

function keyForTransition(ev) {
  // Only meaningful for state transitions; keep separate table
  const c = ev.conditions;
  return [
    ev.event_type, // e.g., state.transition
    ev.state_from ?? "null",
    ev.state_to ?? "null",
    c.time_bucket,
    c.capability_tier,
    c.resource_state,
    c.network_tier,
    c.asset_state,
    c.sensor_presence,
  ].join("|");
}

export class LookoutAggregator {
  constructor() {
    this.aggregateCounts = new Map();   // rowKey -> count
    this.transitionCounts = new Map();  // rowKey -> count
    this.ingested = 0;
    this.rejected = 0;
  }

  ingest(normalizedEvent) {
    if (!normalizedEvent) {
      this.rejected += 1;
      return;
    }
    this.ingested += 1;

    const rowKey = keyForAggregateRow(normalizedEvent);
    const prev = this.aggregateCounts.get(rowKey) || 0;
    this.aggregateCounts.set(rowKey, prev + normalizedEvent.weight);

    if (
      normalizedEvent.event_type === "state.transition" &&
      normalizedEvent.state_from !== null &&
      normalizedEvent.state_to !== null
    ) {
      const tKey = keyForTransition(normalizedEvent);
      const tp = this.transitionCounts.get(tKey) || 0;
      this.transitionCounts.set(tKey, tp + normalizedEvent.weight);
    }
  }

  snapshotAndReset() {
    const minCount = LOOKOUT_CONFIG.aggregation.minCountToEmit;

    // Aggregate rows
    const aggregateRows = [];
    for (const [k, count0] of this.aggregateCounts.entries()) {
      if (count0 < minCount) continue;
      const count = addNoise(count0);
      if (count <= 0) continue;
      aggregateRows.push({ k, count });
    }

    // Transition rows
    const transitionRows = [];
    for (const [k, count0] of this.transitionCounts.entries()) {
      if (count0 < minCount) continue;
      const count = addNoise(count0);
      if (count <= 0) continue;
      transitionRows.push({ k, count });
    }

    // Shuffle output rows to prevent any implied ordering
    for (let i = aggregateRows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [aggregateRows[i], aggregateRows[j]] = [aggregateRows[j], aggregateRows[i]];
    }
    for (let i = transitionRows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [transitionRows[i], transitionRows[j]] = [transitionRows[j], transitionRows[i]];
    }

    const meta = {
      window: {
        ended_at_utc_date: new Date().toISOString().slice(0, 10),
        ended_at_utc_hour: new Date().toISOString().slice(11, 13),
      },
      counts: {
        ingested: this.ingested,
        rejected: this.rejected,
        aggregate_rows: aggregateRows.length,
        transition_rows: transitionRows.length,
      },
    };

    // Reset buffers
    this.aggregateCounts = new Map();
    this.transitionCounts = new Map();
    this.ingested = 0;
    this.rejected = 0;

    return { meta, aggregateRows, transitionRows };
  }
}