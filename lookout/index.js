// scripts/lookout/index.js
import express from "express";
import { LOOKOUT_CONFIG } from "./config.js";
import { validateAndNormalizeEvent } from "./validator.js";
import { LookoutAggregator } from "./aggregator.js";
import { loadSecretsOrThrow, makeS3Client, putObjectText } from "./uploader.js";
import { scheduleHourlyFlush } from "./scheduler.js";

function utcDateHourKey() {
  const iso = new Date().toISOString();
  const date = iso.slice(0, 10);
  const hour = iso.slice(11, 13);
  return { date, hour };
}

function aggregatesObjectKey(prefix, date, hour) {
  // Hourly objects
  return `${prefix}/aggregates/${date}T${hour}.jsonl`;
}

function transitionsObjectKey(prefix, date, hour) {
  return `${prefix}/transitions/${date}T${hour}.csv`;
}

function metaObjectKey(prefix, date, hour) {
  return `${prefix}/meta/${date}T${hour}.json`;
}

function toJsonl(meta, rows) {
  const lines = [];
  // First line: meta
  lines.push(JSON.stringify({ type: "meta", ...meta }));
  // Then: rows
  for (const r of rows) {
    // r.k is a packed key string; keep it as-is to avoid expanding into many columns here
    lines.push(JSON.stringify({ type: "row", key: r.k, count: r.count }));
  }
  return lines.join("\n") + "\n";
}

function toTransitionsCsv(rows) {
  // Columns: packed_key,count
  const header = "key,count\n";
  const body = rows.map((r) => `${JSON.stringify(r.k)},${r.count}`).join("\n");
  return header + (body ? body + "\n" : "");
}

async function main() {
  const secrets = loadSecretsOrThrow();
  const s3 = makeS3Client(secrets);

  const aggregator = new LookoutAggregator();
  const app = express();

  app.use(express.json({ limit: "64kb" }));

  // Intake endpoint for internal events
  app.post("/lookout/event", (req, res) => {
    const normalized = validateAndNormalizeEvent(req.body);
    aggregator.ingest(normalized);
    res.status(204).end();
  });

  // Optional: health
  app.get("/lookout/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Optional: manual flush (no auth added here; use internal routing)
  app.post("/lookout/flush", async (_req, res) => {
    try {
      await flushOnce({ aggregator, s3, bucket: secrets.bucket });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e?.message || e) });
    }
  });

  app.listen(LOOKOUT_CONFIG.port, () => {
    console.log(`[lookout] listening on :${LOOKOUT_CONFIG.port}`);
  });

  if (LOOKOUT_CONFIG.flush.flushOnStart) {
    await flushOnce({ aggregator, s3, bucket: secrets.bucket });
  }

  // Hourly flush (fixed interval). This flushes "what happened in the last hour of runtime".
  // If you want boundary-aligned (top-of-hour) flushing, replace with a scheduler that sleeps until next hour.
  scheduleHourlyFlush(async () => {
    await flushOnce({ aggregator, s3, bucket: secrets.bucket });
  });
}

async function flushOnce({ aggregator, s3, bucket }) {
  const snap = aggregator.snapshotAndReset();
  const { date, hour } = utcDateHourKey();
  const prefix = LOOKOUT_CONFIG.output.prefix;

  const aggregatesKey = aggregatesObjectKey(prefix, date, hour);
  const transitionsKey = transitionsObjectKey(prefix, date, hour);
  const metaKey = metaObjectKey(prefix, date, hour);

  const jsonl = toJsonl(snap.meta, snap.aggregateRows);
  const csv = toTransitionsCsv(snap.transitionRows);
  const metaJson = JSON.stringify(snap.meta, null, 2);

  await putObjectText({
    s3,
    bucket,
    key: aggregatesKey,
    body: jsonl,
    contentType: "application/x-ndjson",
  });

  await putObjectText({
    s3,
    bucket,
    key: transitionsKey,
    body: csv,
    contentType: "text/csv",
  });

  await putObjectText({
    s3,
    bucket,
    key: metaKey,
    body: metaJson,
    contentType: "application/json",
  });

  console.log(
    `[lookout] flushed: aggregates=${snap.meta.counts.aggregate_rows}, transitions=${snap.meta.counts.transition_rows} -> s3://${bucket}/${prefix}/...`
  );
}

main().catch((e) => {
  console.error("[lookout] startup error:", e?.message || e);
  process.exit(1);
});