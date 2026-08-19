import type { BbPluginApi } from "@get-bb/plugin-sdk";
import type {
  UsageHistoryEvent,
  UsageHistoryFileCursor,
} from "@bb/host-daemon-contract";
import { MODEL_PRICING_CATALOG } from "./pricing-catalog.js";
import { resolveEventPricing } from "./pricing.js";

type PluginDatabase = ReturnType<BbPluginApi["storage"]["database"]>;

const META_REFRESHED_AT_KEY = "refreshed_at";

export interface StoredUsageEvent {
  id: string;
  hostId: string;
  provider: UsageHistoryEvent["provider"];
  source: UsageHistoryEvent["source"];
  model: string;
  occurredAt: string;
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  costSource: UsageHistoryEvent["costSource"];
  costUsdMicros: number | null;
  ingestedAt: string;
}

export class UsageStore {
  readonly #db: PluginDatabase;

  constructor(bb: BbPluginApi) {
    this.#db = bb.storage.database();
    bb.storage.migrate(this.#db, [
      `CREATE TABLE IF NOT EXISTS usage_events (
         id TEXT PRIMARY KEY,
         host_id TEXT NOT NULL,
         provider TEXT NOT NULL,
         source TEXT NOT NULL,
         model TEXT NOT NULL,
         occurred_at TEXT NOT NULL,
         input_tokens INTEGER NOT NULL,
         cached_input_tokens INTEGER NOT NULL,
         cache_write_tokens INTEGER NOT NULL,
         output_tokens INTEGER NOT NULL,
         reasoning_output_tokens INTEGER NOT NULL,
         cost_source TEXT NOT NULL,
         cost_usd_micros INTEGER,
         ingested_at TEXT NOT NULL
       )`,
      `CREATE INDEX IF NOT EXISTS usage_events_occurred_at_idx
         ON usage_events(occurred_at)`,
      `CREATE INDEX IF NOT EXISTS usage_events_host_id_idx
         ON usage_events(host_id)`,
      `CREATE TABLE IF NOT EXISTS host_scan_state (
         host_id TEXT PRIMARY KEY,
         file_cursors_json TEXT NOT NULL,
         last_scanned_at TEXT,
         last_truncated INTEGER NOT NULL DEFAULT 0
       )`,
      `CREATE TABLE IF NOT EXISTS model_pricing (
         model_pattern TEXT PRIMARY KEY,
         input_micros_per_million INTEGER NOT NULL,
         cache_read_micros_per_million INTEGER NOT NULL,
         cache_write_micros_per_million INTEGER NOT NULL,
         output_micros_per_million INTEGER NOT NULL
       )`,
      `CREATE TABLE IF NOT EXISTS meta (
         key TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
    ]);
    this.#seedPricingCatalog();
  }

  #seedPricingCatalog(): void {
    const count = this.#db
      .prepare(`SELECT COUNT(*) AS count FROM model_pricing`)
      .get() as { count: number };
    if (count.count > 0) {
      return;
    }
    const insert = this.#db.prepare(
      `INSERT INTO model_pricing (
         model_pattern,
         input_micros_per_million,
         cache_read_micros_per_million,
         cache_write_micros_per_million,
         output_micros_per_million
       ) VALUES (?, ?, ?, ?, ?)`,
    );
    const seed = this.#db.transaction(() => {
      for (const row of MODEL_PRICING_CATALOG) {
        insert.run(
          row.modelPattern,
          row.inputMicrosPerMillion,
          row.cacheReadMicrosPerMillion,
          row.cacheWriteMicrosPerMillion,
          row.outputMicrosPerMillion,
        );
      }
    });
    seed();
  }

  getRefreshedAt(): string | null {
    const row = this.#db
      .prepare(`SELECT value FROM meta WHERE key = ?`)
      .get(META_REFRESHED_AT_KEY) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setRefreshedAt(value: string): void {
    this.#db
      .prepare(
        `INSERT INTO meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(META_REFRESHED_AT_KEY, value);
  }

  getHostFileCursors(hostId: string): UsageHistoryFileCursor[] {
    const row = this.#db
      .prepare(
        `SELECT file_cursors_json FROM host_scan_state WHERE host_id = ?`,
      )
      .get(hostId) as { file_cursors_json: string } | undefined;
    if (!row) {
      return [];
    }
    const parsed = JSON.parse(row.file_cursors_json) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as UsageHistoryFileCursor[];
  }

  saveHostScanState(args: {
    hostId: string;
    fileCursors: UsageHistoryFileCursor[];
    scannedAt: string;
    truncated: boolean;
  }): void {
    this.#db
      .prepare(
        `INSERT INTO host_scan_state (
           host_id,
           file_cursors_json,
           last_scanned_at,
           last_truncated
         ) VALUES (?, ?, ?, ?)
         ON CONFLICT(host_id) DO UPDATE SET
           file_cursors_json = excluded.file_cursors_json,
           last_scanned_at = excluded.last_scanned_at,
           last_truncated = excluded.last_truncated`,
      )
      .run(
        args.hostId,
        JSON.stringify(args.fileCursors),
        args.scannedAt,
        args.truncated ? 1 : 0,
      );
  }

  ingestEvents(
    hostId: string,
    events: UsageHistoryEvent[],
    ingestedAt: string,
  ): number {
    const insert = this.#db.prepare(
      `INSERT OR IGNORE INTO usage_events (
         id,
         host_id,
         provider,
         source,
         model,
         occurred_at,
         input_tokens,
         cached_input_tokens,
         cache_write_tokens,
         output_tokens,
         reasoning_output_tokens,
         cost_source,
         cost_usd_micros,
         ingested_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    let inserted = 0;
    const write = this.#db.transaction(() => {
      for (const event of events) {
        const priced = resolveEventPricing(event);
        const result = insert.run(
          event.id,
          hostId,
          event.provider,
          event.source,
          event.model,
          event.occurredAt,
          event.inputTokens,
          event.cachedInputTokens,
          event.cacheWriteTokens,
          event.outputTokens,
          event.reasoningOutputTokens,
          priced.costSource,
          priced.costUsdMicros,
          ingestedAt,
        );
        inserted += result.changes;
      }
    });
    write();
    return inserted;
  }

  listHostScanStates(): Array<{
    hostId: string;
    lastScannedAt: string | null;
    lastTruncated: boolean;
    eventCount: number;
  }> {
    const rows = this.#db
      .prepare(
        `SELECT
           host_scan_state.host_id AS host_id,
           host_scan_state.last_scanned_at AS last_scanned_at,
           host_scan_state.last_truncated AS last_truncated,
           COUNT(usage_events.id) AS event_count
         FROM host_scan_state
         LEFT JOIN usage_events ON usage_events.host_id = host_scan_state.host_id
         GROUP BY host_scan_state.host_id`,
      )
      .all() as Array<{
      host_id: string;
      last_scanned_at: string | null;
      last_truncated: number;
      event_count: number;
    }>;
    return rows.map((row) => ({
      hostId: row.host_id,
      lastScannedAt: row.last_scanned_at,
      lastTruncated: row.last_truncated === 1,
      eventCount: row.event_count,
    }));
  }

  queryEventsSince(sinceIso: string | null): StoredUsageEvent[] {
    const rows =
      sinceIso === null
        ? (this.#db
            .prepare(`SELECT * FROM usage_events ORDER BY occurred_at ASC`)
            .all() as Array<Record<string, unknown>>)
        : (this.#db
            .prepare(
              `SELECT * FROM usage_events
               WHERE occurred_at >= ?
               ORDER BY occurred_at ASC`,
            )
            .all(sinceIso) as Array<Record<string, unknown>>);
    return rows.map(rowToStoredEvent);
  }
}

function rowToStoredEvent(row: Record<string, unknown>): StoredUsageEvent {
  return {
    id: String(row.id),
    hostId: String(row.host_id),
    provider: String(row.provider) as StoredUsageEvent["provider"],
    source: String(row.source) as StoredUsageEvent["source"],
    model: String(row.model),
    occurredAt: String(row.occurred_at),
    inputTokens: Number(row.input_tokens),
    cachedInputTokens: Number(row.cached_input_tokens),
    cacheWriteTokens: Number(row.cache_write_tokens),
    outputTokens: Number(row.output_tokens),
    reasoningOutputTokens: Number(row.reasoning_output_tokens),
    costSource: String(row.cost_source) as StoredUsageEvent["costSource"],
    costUsdMicros:
      row.cost_usd_micros === null || row.cost_usd_micros === undefined
        ? null
        : Number(row.cost_usd_micros),
    ingestedAt: String(row.ingested_at),
  };
}
