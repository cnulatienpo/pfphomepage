// scripts/lookout/scheduler.js
//
// UTC Top-of-Hour Scheduler
// ------------------------
// Calls a provided async flush function exactly on the hour (UTC).
// No drift, no cumulative error.

function msUntilNextUtcHour() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(now.getUTCHours() + 1);
  return next.getTime() - now.getTime();
}

export function scheduleHourlyFlush(flushFn) {
  let timeoutId = null;
  let intervalId = null;

  async function arm() {
    const delay = msUntilNextUtcHour();

    timeoutId = setTimeout(async () => {
      try {
        await flushFn();
      } catch (e) {
        console.error("[lookout] scheduled flush error:", e?.message || e);
      }

      // After first aligned flush, run every hour
      intervalId = setInterval(async () => {
        try {
          await flushFn();
        } catch (e) {
          console.error("[lookout] scheduled flush error:", e?.message || e);
        }
      }, 60 * 60 * 1000);
    }, delay);
  }

  arm();

  return {
    stop() {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    },
  };
}