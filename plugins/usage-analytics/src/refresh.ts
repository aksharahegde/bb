import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { UsageStore } from "./store.js";

export const USAGE_HISTORY_SCAN_LIMIT = 10_000;
export const USAGE_HISTORY_SCAN_TIMEOUT_MS = 60_000;

export interface RefreshUsageResult {
  refreshedAt: string;
  hostsScanned: number;
  hostsSkipped: number;
  eventsInserted: number;
  truncated: boolean;
}

export interface ConnectedHost {
  id: string;
  name: string;
  status: "connected" | "disconnected";
}

export async function refreshUsageFromHosts(
  bb: BbPluginApi,
  store: UsageStore,
  sinceDays: number | null,
): Promise<RefreshUsageResult> {
  const hosts = await bb.sdk.hosts.list();
  let hostsScanned = 0;
  let hostsSkipped = 0;
  let eventsInserted = 0;
  let truncated = false;
  const ingestedAt = new Date().toISOString();

  for (const host of hosts) {
    if (host.status !== "connected") {
      hostsSkipped += 1;
      continue;
    }
    const fileCursors = store.getHostFileCursors(host.id);
    const scanResult = await bb.hosts.experimental_callRetryableOnlineRpc({
      hostId: host.id,
      timeoutMs: USAGE_HISTORY_SCAN_TIMEOUT_MS,
      command: {
        type: "usage.history.scan",
        sinceDays,
        limit: USAGE_HISTORY_SCAN_LIMIT,
        fileCursors,
      },
    });
    hostsScanned += 1;
    truncated = truncated || scanResult.truncated;
    eventsInserted += store.ingestEvents(host.id, scanResult.events, ingestedAt);
    store.saveHostScanState({
      hostId: host.id,
      fileCursors: scanResult.fileCursors,
      scannedAt: scanResult.scannedAt,
      truncated: scanResult.truncated,
    });
  }

  const refreshedAt = new Date().toISOString();
  store.setRefreshedAt(refreshedAt);

  return {
    refreshedAt,
    hostsScanned,
    hostsSkipped,
    eventsInserted,
    truncated,
  };
}
