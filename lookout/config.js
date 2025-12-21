// scripts/lookout/config.js
export const LOOKOUT_CONFIG = {
  // Server
  port: process.env.LOOKOUT_PORT ? Number(process.env.LOOKOUT_PORT) : 8787,

  // Time bucketing
  timeZone: process.env.LOOKOUT_TZ || "UTC",

  // Hourly flush
  flush: {
    // flush every hour on the hour (UTC by default)
    intervalMs: 60 * 60 * 1000,
    // also flush at startup? (useful in dev)
    flushOnStart: false,
  },

  // Aggregation behavior
  aggregation: {
    // Drop low-frequency rows on flush
    minCountToEmit: 3,

    // Optional integer noise added at flush-time per row (0 disables)
    // Applied after minCountToEmit gate.
    noiseAmplitude: 0,
  },

  // Storage / naming
  output: {
    prefix: "lookout", // object key prefix in B2 bucket
  },
};